"use client";
import {
  useIsStreamingStore,
  useSuggestionsStore,
  useUploadedStore,
} from "@/store/uploadStore";
import axios from "axios";
import "katex/dist/katex.min.css";
import { motion } from "motion/react";
import { Merriweather } from "next/font/google";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Button } from "../ui/button";
import CodeBlock from "./CodeBlock";
import InputBox from "./inputBox";
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
export default function AnswerViewArea() {
  const uploaded = useUploadedStore((state) => state.uploaded);
  // const { open } = useSidebar();
  const [answer, setAnswer] = useState("");
  const isStreaming = useIsStreamingStore((state) => state.isStreaming);
  const setIsStreaming = useIsStreamingStore((state) => state.setIsStreaming);
  const data = useSuggestionsStore((state) => state.suggestions);

  const askQuestion = async (question: string) => {
    if (!question.trim()) return;

    setAnswer("");
    setIsStreaming(true);

    try {
      const formData = new FormData();
      formData.append("question", question);
      localStorage.removeItem("backendToken");
      let token: string | null = localStorage.getItem("backendToken");
      if (!token) {
        const response = await axios.get(`/api/backendJWT`);
        token = response.data as string;
        localStorage.setItem("backendToken", token);
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/ask/`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              setIsStreaming(false);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setAnswer((prev) => prev + parsed.content);
              } else if (parsed.error) {
                setAnswer((prev) => prev + `\n\nError: ${parsed.error}`);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
              console.log("Parse error for:", data);
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setAnswer("Error occurred while streaming response");
    } finally {
      setIsStreaming(false);
    }
  };
  return (
    uploaded && (
      <motion.div
        initial={{ x: 200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex border-t-2 flex-col p-1  lg:w-full w-screen h-[93vh] lg:h-[93vh]"
      >
        <div
          className={`font-serif ${merriweather.className} overflow-y-auto lg:py-10 lg:mx-30  lg:px-8 scrollbar-thin
    prose prose-slate max-w-none
    leading-normal
    [&>*]:text-md
    [&_h1]:text-2xl
    [&_h2]:text-xl
    [&_h3]:text-lg
    [&_li]:text-md
    [&_p]:text-md
    [&_.katex-display]:text-center mb-1 [&_.katex-display]:my-6

    lg:leading-relaxed
    lg:[&>*]:text-lg
    lg:[&_h1]:text-3xl
    lg:[&_h2]:text-2xl
    lg:[&_h3]:text-xl
    lg:[&_li]:text-lg
    lg:[&_p]:text-lg
    lg:[&_.katex-display]:text-center lg:mb-1.5 lg:[&_.katex-display]:my-6
  `}
        >
          {answer.length === 0 && !isStreaming && (
            <div className="w-full mt-5 lg:mt-3 flex flex-col gap-2 ">
              <div className="font-sans text-xl mb-4 text-center lg:mb-8 lg:text-2xl">
                {data?.summary}
              </div>
              <div className="flex justify-center w-full flex-wrap gap-2 lg:gap-3">
                {data?.suggested_questions?.map((s, index) => (
                  <div key={index}>
                    <Button
                      onClick={() => askQuestion(s)}
                      className="cursor-pointer font-light lg:text-xl h-9 rounded-full lg:h-10 px-2 text-[3vw] lg:p-5 duration-500 hover:shadow-lg  hover:bg-blue-300 bg-blue-100 text-black border-1"
                    >
                      {s}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isStreaming && answer.length === 0 && (
            <div className="font-mono font-stretch-condensed animate-pulse">
              Thinking...
            </div>
          )}
          <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code: CodeBlock,
            }}
          >
            {answer}
          </ReactMarkdown>
        </div>

        <div className=" mt-auto">
          <div className="lg:max-w-4xl w-full mx-auto">
            <InputBox setAnswer={setAnswer} askQuestion={askQuestion} />
          </div>
        </div>
      </motion.div>
    )
  );
}
