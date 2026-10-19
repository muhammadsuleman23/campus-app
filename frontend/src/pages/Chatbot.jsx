import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaPaperPlane, FaRobot, FaArrowLeft } from "react-icons/fa";
import ReactMarkdown from "react-markdown"; 
import API from "../api";

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! I am UniBot. Ask me about Rides, Gigs, Marketplace, or Roommates." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { sender: "user", text: input }];
    setMessages(newMessages);
    const userInput = input; // Input clear hone se pehle save karein
    setInput("");
    setLoading(true);

    try {
      // ✅ FIXED PATH: Change /chat to /chatbot to match server.js
      const { data } = await API.post("/chatbot", { message: userInput });

      setMessages([...newMessages, { sender: "bot", text: data.reply }]);
    } catch (error) {
      setMessages([...newMessages, { sender: "bot", text: "Sorry, I'm facing a connection issue." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 sticky top-0 z-50">
        <button onClick={() => navigate("/dashboard")} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
          <FaArrowLeft />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-green-500 flex items-center justify-center shadow-lg">
          <FaRobot className="text-xl" />
        </div>
        <div>
          <h1 className="font-bold">UniBot AI</h1>
          <p className="text-[10px] text-green-600 font-bold uppercase">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((m, index) => (
          <div key={index} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${
              m.sender === "user" ? "bg-blue-600 rounded-br-none" : "bg-white border border-gray-200 rounded-bl-none"
            }`}>
              {m.sender === "user" ? (
                <p>{m.text}</p>
              ) : (
                <ReactMarkdown 
                  components={{
                    ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-2 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-emerald-600" {...props} />
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-gray-500 text-[10px] ml-4 animate-pulse italic">Bot is thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSend} className="flex gap-2 relative">
          <input 
            type="text" 
            placeholder="Search for rides, items, roommates..." 
            className="flex-1 bg-white text-gray-900 px-5 py-4 rounded-full border border-gray-200 outline-none focus:border-emerald-500 transition"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center absolute right-1.5 top-1.5 hover:scale-105 active:scale-95 transition">
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;