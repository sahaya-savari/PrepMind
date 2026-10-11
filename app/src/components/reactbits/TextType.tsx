import React, { useState, useEffect } from 'react';

export interface TextTypeProps {
  text: string | string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
  loop?: boolean;
  className?: string;
  cursorClassName?: string;
  onComplete?: () => void;
}

/**
 * TextType Component (Terminal-Dark Spec)
 * Zero external dependencies typewriter animation with prefers-reduced-motion safety.
 */
export const TextType: React.FC<TextTypeProps> = ({
  text,
  typingSpeed = 75,
  deletingSpeed = 30,
  pauseDuration = 1500,
  showCursor = true,
  cursorCharacter = '|',
  loop = false,
  className = '',
  cursorClassName = '',
  onComplete,
}) => {
  const strings = Array.isArray(text) ? text : [text];
  const [currentStringIndex, setCurrentStringIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setCurrentText(strings.join(' '));
      setIsFinished(true);
      onComplete?.();
      return;
    }

    if (isFinished) return;

    const fullString = strings[currentStringIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (currentText.length < fullString.length) {
        timeout = setTimeout(() => {
          setCurrentText(fullString.slice(0, currentText.length + 1));
        }, typingSpeed);
      } else {
        if (currentStringIndex === strings.length - 1 && !loop) {
          setIsFinished(true);
          onComplete?.();
          return;
        }

        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDuration);
      }
    } else {
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(fullString.slice(0, currentText.length - 1));
        }, deletingSpeed);
      } else {
        setIsDeleting(false);
        setCurrentStringIndex((prev) => (prev + 1) % strings.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [
    currentText,
    isDeleting,
    currentStringIndex,
    strings,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    loop,
    isFinished,
    prefersReducedMotion,
    onComplete,
  ]);

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span>{currentText}</span>
      {showCursor && !isFinished && (
        <span
          className={`inline-block font-mono text-midnight-accent ml-0.5 animate-pulse select-none ${cursorClassName}`}
          aria-hidden="true"
        >
          {cursorCharacter}
        </span>
      )}
    </span>
  );
};

export default TextType;
