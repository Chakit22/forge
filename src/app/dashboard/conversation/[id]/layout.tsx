"use client";

import React from "react";
import WeaviateConversationWrapper from "../wrapper";

export default function ConversationLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  
  console.log(`Layout rendering for conversation ${unwrappedParams.id}`);
  
  return (
    <WeaviateConversationWrapper 
      key={`conversation-wrapper-${unwrappedParams.id}`} 
      conversationId={unwrappedParams.id}
    >
      {children}
    </WeaviateConversationWrapper>
  );
} 