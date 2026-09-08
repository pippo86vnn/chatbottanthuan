import { useState, useRef, useEffect } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useVoiceChat() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'vi-VN';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        transcriptRef.current = currentTranscript;
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        if (transcriptRef.current.trim() !== '') {
          setFinalTranscript(transcriptRef.current);
          transcriptRef.current = '';
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Lỗi nhận diện giọng nói:', event.error);
        setIsRecording(false);
      };
    } else {
      console.warn('Trình duyệt không hỗ trợ Web Speech API.');
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording && !isProcessing && !isPlaying) {
      setTranscript('');
      setFinalTranscript('');
      transcriptRef.current = '';
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Lỗi khi bắt đầu nhận diện", e);
      }
    }
  };

  const playAudio = (base64String: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = `data:audio/mp3;base64,${base64String}`;
    audioRef.current = new Audio(audioUrl);
    
    setIsPlaying(true);
    setIsProcessing(false);

    audioRef.current.onended = () => {
      setIsPlaying(false);
    };

    audioRef.current.onerror = () => {
      console.error('Lỗi phát âm thanh');
      setIsPlaying(false);
    };

    audioRef.current.play().catch(e => {
      console.warn('Autoplay bị trình duyệt chặn.', e);
      setIsPlaying(false);
    });
  };

  const playWelcomeMessage = () => {
    // Mock audio (tiếng beep ngắn hoặc rỗng)
    const mockAudioBase64 = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIwB3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3//tQAAAEAAABkAAAAAAAARkFNRTMuMTAwA8AAAAAAAABRAAABCAAAAAAAAAAAAAAA//tQAAAEAAABkAAAAAAAARkFNRTMuMTAwA8AAAAAAAABRAAABCAAAAAAAAAAAAAAA";
    playAudio(mockAudioBase64);
  };

  return {
    isRecording,
    isProcessing,
    setIsProcessing,
    isPlaying,
    transcript,
    finalTranscript,
    setTranscript,
    startRecording,
    playAudio,
    playWelcomeMessage
  };
}
