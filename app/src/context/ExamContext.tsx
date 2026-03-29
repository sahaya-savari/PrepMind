import { createContext, useContext, useEffect, useState } from "react";

type ExamContextType = {
  exam: string;
  setExam: (exam: string) => void;
};

const ExamContext = createContext<ExamContextType | null>(null);

export const ExamProvider = ({ children }: { children: React.ReactNode }) => {
  const [exam, setExam] = useState(() => localStorage.getItem("exam") || "TCS NQT");

  useEffect(() => {
    localStorage.setItem("exam", exam);
  }, [exam]);

  return (
    <ExamContext.Provider value={{ exam, setExam }}>
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => {
  const context = useContext(ExamContext);
  if (!context) throw new Error("useExam must be used inside ExamProvider");
  return context;
};
