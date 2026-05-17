import os
import re
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_groq import ChatGroq  
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain.retrievers import MultiQueryRetriever
import os

# Load environment variables
load_dotenv()

# ── Prediction tool (StockX/tools_prediction.py) ────────────────────────────
from app.StockX.tools_prediction import handle_prediction_query, is_prediction_query  # noqa: E402

# Initialize LLMs
# Using ChatGroq for cheap operations (routing, rewriting, sub-queries, etc.)
cheap_llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.2)

# Using OpenAI for the final generation step and embeddings
strong_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Initialize Vector Store
# Note: You can replace 'faiss_path' with the actual path to your FAISS index
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
faiss_path = os.path.join(BASE_DIR, "faiss_vectorstore")

try:
    vectorstore = FAISS.load_local(
        faiss_path, embeddings, allow_dangerous_deserialization=True
    )
    base_retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
except Exception as e:
    print(f"Warning: Could not load FAISS index from {faiss_path}. Exception: {e}")
    # Fallback to an empty vector store if not found for placeholder purposes
    import faiss
    from langchain_community.docstore.in_memory import InMemoryDocstore
    index = faiss.IndexFlatL2(len(embeddings.embed_query("hello")))
    vectorstore = FAISS(
        embedding_function=embeddings,
        index=index,
        docstore=InMemoryDocstore({}),
        index_to_docstore_id={}
    )
    base_retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

# ─────────────────────────────────────────────────────────────────────────────
# Base Retrieval
# ─────────────────────────────────────────────────────────────────────────────

def smart_query(question: str, k: int = 5) -> list[Document]:
    """Base retrieval using similarity search."""
    candidates = vectorstore.similarity_search(question, k=k)
    return candidates

# ─────────────────────────────────────────────────────────────────────────────
# Contextual Compression
# ─────────────────────────────────────────────────────────────────────────────

def Contextual_Compression(query: str, docs: list[Document]) -> list[Document]:
    if not docs:
        return docs

    compress_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at extracting relevant information from documents.
Extract only the sentences directly relevant to answering the question.
If nothing is relevant output exactly: NO_OUTPUT
Output only the extracted sentences, nothing else."""),
        ("human", "Question: {query}\n\nDocument: {document}")
    ])

    chain = compress_prompt | cheap_llm | StrOutputParser()
    compressed = []

    for doc in docs:
        result = chain.invoke({
            "query": query,
            "document": doc.page_content
        })
        if result.strip() and result.strip() != "NO_OUTPUT":
            compressed.append(Document(
                page_content=result.strip(),
                metadata=doc.metadata
            ))

    print(f"  [Compression] {len(docs)} text docs → {len(compressed)} compressed chunks")
    return compressed

# ─────────────────────────────────────────────────────────────────────────────
# Query Techniques
# ─────────────────────────────────────────────────────────────────────────────

def query_rewriting(query: str) -> str:
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at improving search queries.
Rewrite the query to be clearer for semantic search.
- Fix grammar and clarity only.
- Do not add extra context.
- Keep the query SHORT.
Output only the rewritten query, nothing else."""),
        ("human", "{query}")
    ])
    result = (prompt | cheap_llm | StrOutputParser()).invoke({"query": query})
    print(f"Original {query} --> Rewritten query: {result}")
    return result

def step_back_prompting(query: str) -> list[Document]:
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at abstracting specific questions into broader principles.
Given the specific question below, generate a more general question that covers the underlying concept.
Specific question: {query}
Broader question (output only the question, nothing else):""")
    ])
    result = (prompt | cheap_llm | StrOutputParser()).invoke({"query": query})
    
    broader_docs = smart_query(result)
    abstract_docs = smart_query(query)

    docs = []
    seen = set()
    for doc in broader_docs + abstract_docs:
        if doc.page_content not in seen:
            seen.add(doc.page_content)
            docs.append(doc)
    return docs

def multi_query_retrieval(query: str) -> list[Document]:
    retriever = MultiQueryRetriever.from_llm(
        retriever=base_retriever,
        llm=cheap_llm,
        prompt=ChatPromptTemplate.from_template("""
You are an AI assistant helping search through documents.
Generate 4 different versions of the following question to improve document retrieval.
Use different vocabulary and perspectives.
Output one question per line, nothing else.

Original question: {question}
""")
    )
    base_docs = retriever.invoke(query)
    
    # Deduplicate
    seen = set()
    result = []
    for doc in base_docs:
        if doc.page_content not in seen:
            seen.add(doc.page_content)
            result.append(doc)

    print(f"[Multi-Query] Retrieved {len(result)} unique docs\n")
    return result

def HYDE_Query(query: str) -> list[Document]:
    hyde_prompt = ChatPromptTemplate.from_template("""
You are an expert on the subject matter.
Write a short plausible answer (3-5 sentences) to the following question.

Question: {query}

Hypothetical answer:
""")
    hyp_answer = (hyde_prompt | cheap_llm | StrOutputParser()).invoke({"query": query})
    return smart_query(hyp_answer)

def decomposition_retrieval(query: str) -> tuple[list[Document], list[str]]:
    word_count = len(query.split())
    has_and = bool(re.search(r'\band\b|\bvs\b|\bversus\b|\bcompare\b', query.lower()))
    
    if word_count <= 12 and not has_and:
        print("  [Decompose] Simple lookup — skipping decomposition, direct retrieval")
        docs = smart_query(query)
        return docs, []

    prompt = ChatPromptTemplate.from_messages([
        ("system", """Break the following complex question into 2-4 simpler sub-questions that can each be answered independently. Output only the sub-questions, one per line."""),
        ("human", "{query}")
    ])
    sub_text = (prompt | cheap_llm | StrOutputParser()).invoke({"query": query})
    sub_questions = [q.strip() for q in sub_text.split("\n") if q.strip()]

    docs = []
    seen = set()
    for sub_q in sub_questions:
        for doc in smart_query(sub_q):
            if doc.page_content not in seen:
                seen.add(doc.page_content)
                docs.append(doc)

    return docs, sub_questions

def reciprocal_rank_fusion(result_list: list[list[Document]], k: int = 60) -> list[Document]:
    score_dict = {}
    doc_map = {}

    for result in result_list:
        for rank, doc in enumerate(result, start=1):
            key = doc.page_content
            score_dict[key] = score_dict.get(key, 0) + 1 / (rank + k)
            doc_map[key] = doc

    ranked = sorted(score_dict.items(), key=lambda x: x[1], reverse=True)
    return [doc_map[key] for key, _ in ranked]

def rag_fusion(query: str) -> list[Document]:
    fusion_prompt = ChatPromptTemplate.from_template("""
Generate 4 search query variants. Each variant should use different phrasing or focus on a different angle.
Output one per line, nothing else.

Question: {query}
""")
    query_variants = (fusion_prompt | cheap_llm | StrOutputParser()).invoke({"query": query})
    variants = [query] + [q.strip() for q in query_variants.split("\n") if q.strip()]
    
    all_docs = [smart_query(q) for q in variants]
    return reciprocal_rank_fusion(all_docs, k=60)

# ─────────────────────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────────────────────

ROUTER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a query analysis expert for a RAG system.

Analyze the user query and select which transformation techniques are needed.
Choose ONLY techniques that will genuinely help — do not pick all of them.

Available techniques:
- rewrite     : query has typos, abbreviations, bad grammar, or is too casual
- step_back   : query is too specific and needs broader conceptual context
- multi_query : query could match docs with different vocabulary/phrasing
- hyde        : query is very short or sparse — a hypothetical answer helps
- decompose   : query has multiple distinct parts needing SEPARATE retrieval
- rag_fusion  : use instead of multi_query when you want smarter RRF reranking

Decision rules:
- Clean, specific, well-formed query  →  []
- Messy/casual query                  →  always include rewrite first
- Very short query (under 5 words)    →  hyde
- Multi-part query with "and"/"vs"    →  decompose
- Vocabulary mismatch likely          →  rag_fusion
- Too narrow/specific                 →  step_back
- Simple direct lookup (single fact)  →  [] (no technique needed)
- Do NOT pick both multi_query and rag_fusion
- Maximum 3 techniques

Output ONLY a valid Python list of strings. No explanation. No markdown.
Examples: ["rewrite", "hyde"] | ["decompose"] | []"""),
    ("human", "Query: {query}")
])

def router_channel(query: str) -> list[str]:
    response = (ROUTER_PROMPT | cheap_llm | StrOutputParser()).invoke({"query": query})
    try:
        techniques = eval(response.strip())
        valid = {"rewrite", "step_back", "multi_query", "hyde", "decompose", "rag_fusion"}
        return [t for t in techniques if t in valid]
    except Exception as e:
        print(f"Router error: {e}. Defaulting to []")
        return []

# ─────────────────────────────────────────────────────────────────────────────
# Pipeline Orchestration
# ─────────────────────────────────────────────────────────────────────────────

def smart_pipeline(raw_query: str) -> str:
    print("\n" + "=" * 60)
    print(f"QUERY: {raw_query}")
    print("=" * 60)

    # ── Tool: Stock Prediction ───────────────────────────────────────────────
    # If the query is asking for a stock prediction/forecast, short-circuit
    # the RAG pipeline and call the ML prediction API directly.
    if is_prediction_query(raw_query):
        print("[Router] Prediction intent detected → delegating to PredictionTool")
        return handle_prediction_query(raw_query)
    # ─────────────────────────────────────────────────────────────────────────

    print("\n[Step 1] Routing...")
    techniques = router_channel(raw_query)
    print(f"Techniques selected: {techniques}")

    print("\n[Step 2] Applying techniques...")
    working_query = raw_query
    all_docs = []
    sub_questions = []
    seen = set()

    def add_docs(docs: list[Document]):
        for doc in docs:
            if doc.page_content not in seen:
                seen.add(doc.page_content)
                all_docs.append(doc)

    if "rewrite" in techniques:
        working_query = query_rewriting(raw_query)
        print("--Rewrite--")

    if "step_back" in techniques:
        add_docs(step_back_prompting(working_query))
        print("--step_back--")

    if "multi_query" in techniques:
        add_docs(multi_query_retrieval(working_query))
        print("--multi_query--")

    if "hyde" in techniques:
        add_docs(HYDE_Query(working_query))
        print("HYDE")

    if "decompose" in techniques:
        decomp_docs, sub_questions = decomposition_retrieval(working_query)
        add_docs(decomp_docs)
        print("Decompose")

    if "rag_fusion" in techniques:
        add_docs(rag_fusion(working_query))
        print("RAG_FUSION")

    if not all_docs:
        print("  [Direct] Plain retrieval on query")
        add_docs(smart_query(working_query))

    print(f"\n[Step 3] {len(all_docs)} unique docs before compression")

    compressed_docs = Contextual_Compression(working_query, all_docs)
    final_docs = compressed_docs if compressed_docs else all_docs

    context = "\n\n".join([doc.page_content for doc in final_docs])

    print("\n[Step 4] Generating answer with GPT-4o-mini...")

    if sub_questions:
        sub_q_text = "\n".join(f"- {q}" for q in sub_questions)
        question_section = (
            f"Original question: {working_query}\n\n"
            f"Address each of these sub-questions in your answer:\n{sub_q_text}"
        )
    else:
        question_section = f"Question: {working_query}"

    final_prompt = ChatPromptTemplate.from_template("""
You are an expert answering user queries using only the provided context.
If the context is insufficient, say so clearly.

Context:
{context}

{question_section}

Answer:
""")

    answer = (final_prompt | strong_llm | StrOutputParser()).invoke({
        "context": context,
        "question_section": question_section,
    })

    print("\n" + "=" * 60)
    print("ANSWER:")
    print(answer)
    print("=" * 60)
    return answer

if __name__ == "__main__":
    test_queries = [
        "Who are the founders of TradeFinlytix?",
        "What is eligible to use TradeFinlytix?"
    ]

    for q in test_queries:
        smart_pipeline(q)
