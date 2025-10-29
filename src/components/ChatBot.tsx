'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatBot() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize messages after hydration
    setMessages([
      {
        role: 'assistant',
        content: 'こんにちは！Jグランツ補助金検索ボットです。補助金に関する質問をお気軽にどうぞ。例: 「最新の補助金を教えて」「東京都の製造業向け補助金はある?」',
        timestamp: new Date(),
      },
    ]);
    setIsHydrated(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error('APIリクエストに失敗しました');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Prevent hydration mismatch by not rendering until hydrated
  if (!isHydrated) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h1>Jグランツ補助金検索ボット</h1>
          <p>補助金情報を自然言語で検索できます</p>
        </div>
        <div className="messages-container" />
        <form className="input-container">
          <input
            type="text"
            placeholder="例: 「最新の補助金を教えて」"
            disabled={true}
            className="chat-input"
          />
          <button type="submit" disabled={true} className="send-button">
            送信
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Jグランツ補助金検索ボット</h1>
        <p>補助金情報を自然言語で検索できます</p>
      </div>

      <div className="messages-container">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant-message">
            <div className="message-content">
              <div className="loading-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例: 「最新の補助金を教えて」"
          disabled={isLoading}
          className="chat-input"
        />
        <button type="submit" disabled={isLoading || !input.trim()} className="send-button">
          送信
        </button>
      </form>

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 1200px;
          margin: 0 auto;
          background: #f5f5f5;
        }

        .chat-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .chat-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .chat-header p {
          margin: 8px 0 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          display: flex;
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .user-message {
          justify-content: flex-end;
        }

        .assistant-message {
          justify-content: flex-start;
        }

        .message-content {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 12px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .user-message .message-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .assistant-message .message-content {
          background: white;
          color: #333;
        }

        .message-text {
          white-space: pre-wrap;
          word-wrap: break-word;
          line-height: 1.5;
        }

        .message-time {
          font-size: 11px;
          margin-top: 6px;
          opacity: 0.7;
          text-align: right;
        }

        .loading-indicator {
          display: flex;
          gap: 6px;
          padding: 8px 0;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #667eea;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        .input-container {
          display: flex;
          gap: 12px;
          padding: 20px;
          background: white;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }

        .chat-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 24px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.3s;
        }

        .chat-input:focus {
          border-color: #667eea;
        }

        .chat-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .send-button {
          padding: 12px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .message-content {
            max-width: 85%;
          }

          .chat-header h1 {
            font-size: 20px;
          }

          .chat-header p {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
