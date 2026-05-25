"use client";

import React from "react";

export const H1 = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h1 className={`text-2xl md:text-3xl font-semibold leading-tight ${className}`}>{children}</h1>
);

export const H2 = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`text-xl md:text-2xl font-medium ${className}`}>{children}</h2>
);

export const P = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm md:text-base text-gray-700 dark:text-gray-300 ${className}`}>{children}</p>
);

export const Typography = { H1, H2, P };

export default Typography;
