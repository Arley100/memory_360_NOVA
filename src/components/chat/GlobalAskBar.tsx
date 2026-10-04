"use client";
import { useState } from "react";
import { Icon } from "@/components/UI";
import { useNovaChat } from "./NovaChatProvider";
export function GlobalAskBar() {
  const chat = useNovaChat();
  const [question, setQuestion] = useState("");
  return <>
    <form className="header-search nova-global-ask" role="search" onSubmit={(e) => { e.preventDefault(); if (!question.trim()) { chat.openChat(); return; } const sent = question; void chat.send(sent).then((success) => { if (success) setQuestion((current) => current === sent ? "" : current); }); }}>
      <Icon name="search" /><label htmlFor="nova-global-question" className="sr-only">Ask a question about NOVA</label>
      <input id="nova-global-question" placeholder="Ask a question about NOVA (EN or FR)…" className="min-w-0 flex-1 bg-transparent text-sm" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={4000} />
      <button className="search-submit" disabled={chat.busy || !chat.ready}>Ask</button>
    </form>
    <button className="nova-mobile-ask search-submit" onClick={chat.openChat} aria-label="Open NOVA Assistant"><Icon name="search" size={16} />Ask NOVA</button>
  </>;
}
