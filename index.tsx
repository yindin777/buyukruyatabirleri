import React, { useState, useEffect, useRef } from 'react';

const API_ENDPOINT = '/api'; // Assume api.js is hosted at /api

interface Interpretation {
  source: string;
  text: string;
  notes: string;
  reactions: {
    thumbsUp: boolean;
    thumbsDown: boolean;
  };
}


interface HistoryItem {
  dreamText: string;
  interpretations: {
    [language: string]: Interpretation[];
  };
  userNotes: string;
}



const DreamInterpreter: React.FC = () => {
  const [dreamText, setDreamText] = useState('');
  const [interpretations, setInterpretations] = useState<{ [language: string]: Interpretation[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || 'YOUR_DEFAULT_API_KEY');
    const [backgroundImage, setBackgroundImage] = useState(localStorage.getItem('backgroundImage') || '');
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
    const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true' || false);
  const [interpretationHistory, setInterpretationHistory] = useState<HistoryItem[]>(() => {
        const storedHistory = localStorage.getItem('interpretationHistory');
        return storedHistory ? JSON.parse(storedHistory) : [];
      });
  const [userNotes, setUserNotes] = useState("");
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

   const primaryColor = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800';
    const secondaryColor = darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700';
     const accentColor = 'bg-indigo-500 text-white';
    const borderColor = darkMode ? 'border-gray-600' : 'border-gray-300';


  useEffect(() => {
        localStorage.setItem('apiKey', apiKey);
        localStorage.setItem('backgroundImage', backgroundImage);
        localStorage.setItem('language', language);
        localStorage.setItem('darkMode', String(darkMode));
    }, [apiKey, backgroundImage, language, darkMode]);


    useEffect(() => {
        localStorage.setItem('interpretationHistory', JSON.stringify(interpretationHistory));
    }, [interpretationHistory]);

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
    };

    const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setBackgroundImage(e.target.value);
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setLanguage(e.target.value);
    };

    const handleDarkModeChange = () => {
      setDarkMode(!darkMode);
    };


    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
              setCurrentImage(event.target?.result as string);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCurrentAudio(event.target?.result as string);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };


  const handleDreamTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDreamText(e.target.value);
  };

  const fetchInterpretations = async () => {
      if (!dreamText.trim()) {
          setError('Please enter your dream text.');
          return;
      }


    setLoading(true);
    setError(null);
    try {
        const cachedResponse = localStorage.getItem(`dream_interpretation_${dreamText}_${language}`);
            if (cachedResponse) {
                setInterpretations(JSON.parse(cachedResponse));
                setLoading(false);
                return;
            }
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dreamText: dreamText,
          language: language,
          apiKey: apiKey,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
              setError('API Usage limit reached. Please provide your own API Key.');
          }else {
               const errorData = await response.json();
              setError(errorData.message || 'Failed to fetch interpretations. Please try again.');
           }

          setLoading(false);
          return;
      }

        const data = await response.json();
        setInterpretations(data);
        localStorage.setItem(`dream_interpretation_${dreamText}_${language}`, JSON.stringify(data));

        setInterpretationHistory((prevHistory) => [
              {
                  dreamText: dreamText,
                  interpretations: data,
                  userNotes: "",
              },
              ...prevHistory,
          ].slice(0, 5));

    } catch (err) {
      console.error('Error fetching interpretations:', err);
      setError('An error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteChange = (event: React.ChangeEvent<HTMLTextAreaElement>, index: number, source:string) => {
    const newInterpretations = {...interpretations};
      if(newInterpretations[language]){
        newInterpretations[language][index].notes = event.target.value
          setInterpretations(newInterpretations);
      }


    setInterpretationHistory((prevHistory) => {
            return prevHistory.map((item) => {
                if (item.dreamText === dreamText) {
                    const updatedInterpretations = {...item.interpretations};
                     if (updatedInterpretations[language]) {
                         updatedInterpretations[language] = updatedInterpretations[language].map((inter, i) => {
                           if(i === index && inter.source === source) {
                            return {...inter, notes: event.target.value}
                           }
                          return inter
                        })
                      }

                    return { ...item, interpretations: updatedInterpretations };
                }
                return item;
            });
    });


};

const handleReactionClick = (index:number, reactionType: 'thumbsUp' | 'thumbsDown', source: string) => {
    const newInterpretations = {...interpretations};
       if(newInterpretations[language]){
        const updatedInterpretations = newInterpretations[language].map((inter, i) => {
          if(i === index && inter.source === source) {
            return {
              ...inter,
              reactions: {
                ...inter.reactions,
                [reactionType]: !inter.reactions[reactionType]
              }
            }
          }
           return inter
        })
          newInterpretations[language] = updatedInterpretations;
        setInterpretations(newInterpretations);
       }

    setInterpretationHistory((prevHistory) => {
         return prevHistory.map((item) => {
            if (item.dreamText === dreamText) {
                    const updatedInterpretations = {...item.interpretations};
                     if (updatedInterpretations[language]) {
                        updatedInterpretations[language] = updatedInterpretations[language].map((inter, i) => {
                         if(i === index && inter.source === source) {
                            return {
                                ...inter,
                                reactions: {
                                ...inter.reactions,
                                [reactionType]: !inter.reactions[reactionType]
                            }
                        }
                        }
                       return inter
                        })
                    }

                    return { ...item, interpretations: updatedInterpretations };
              }
          return item;
        });
    });


  };

  const handleCopy = async (text:string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("failed to copy", err)
    }
  }


   const clearHistory = () => {
       setInterpretationHistory([]);
   }

    const handleBack = () => {
         if (interpretationHistory.length > 0) {
             setDreamText(interpretationHistory[0].dreamText);
             setInterpretations(interpretationHistory[0].interpretations);
             setUserNotes(interpretationHistory[0].userNotes);
         }
   };


  return (
        <div className={`${primaryColor} min-h-screen flex flex-col`}>
        <header className={`p-4  ${secondaryColor} border-b ${borderColor} flex justify-between items-center`}>
        <h1 className="text-2xl font-semibold">Dream Interpreter</h1>
          <div className="flex gap-2 items-center">
           {interpretationHistory.length > 0 &&  (
                    <button onClick={handleBack} className={`py-2 px-4 rounded-md ${accentColor} hover:bg-indigo-600`}>Back</button>
            )}
            <button onClick={() => setShowSettings(!showSettings)} className={`py-2 px-4 rounded-md ${accentColor} hover:bg-indigo-600`}>Settings</button>
            </div>
        </header>
      {showSettings && (
          <div className={`p-4 ${secondaryColor} border-b ${borderColor} flex flex-col gap-4 `}>
            <h2 className="text-xl font-semibold">Settings</h2>
              <div className="flex flex-col gap-2">
                  <label htmlFor="api-key" className="font-medium">API Key:</label>
                   <input
                      type="text"
                      id="api-key"
                      className={`p-2 rounded-md ${primaryColor} border ${borderColor}`}
                      value={apiKey}
                      onChange={handleApiKeyChange}
                  />
              </div>

               <div className="flex flex-col gap-2">
                 <label htmlFor="background-image" className="font-medium">Background Image URL:</label>
                    <input
                      type="text"
                        id="background-image"
                       className={`p-2 rounded-md ${primaryColor} border ${borderColor}`}
                        value={backgroundImage}
                        onChange={handleBackgroundImageChange}
                    />
                 </div>


            <div className="flex flex-col gap-2">
                <label htmlFor="language-select" className="font-medium">Language:</label>
                <select
                      id="language-select"
                      className={`p-2 rounded-md ${primaryColor} border ${borderColor}`}
                      value={language}
                      onChange={handleLanguageChange}
                    >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                     <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                        </select>
            </div>

            <div className="flex items-center gap-2">
                <label htmlFor="dark-mode-toggle" className="font-medium">Dark Mode:</label>
                <input
                    type="checkbox"
                     id="dark-mode-toggle"
                     className="w-5 h-5 cursor-pointer"
                    checked={darkMode}
                    onChange={handleDarkModeChange}
                />
            </div>
          </div>
      )}

       <main className="p-4 flex-1" style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
           <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                     <label htmlFor="dream-text" className="font-medium">Dream Text:</label>
                    <textarea
                      id="dream-text"
                      className={`p-2 rounded-md ${primaryColor} border ${borderColor}`}
                      rows={5}
                      value={dreamText}
                      onChange={handleDreamTextChange}
                      placeholder="Enter your dream here..."
                    />
                    </div>
              <div className="flex items-center gap-2">
                     <button
                      className={`py-2 px-4 rounded-md ${accentColor} hover:bg-indigo-600`}
                      onClick={fetchInterpretations}
                       disabled={loading}
                    >
                         {loading ? "Loading..." : "Get Interpretation"}
                     </button>
                 {interpretationHistory.length > 0 &&
                  <button onClick={clearHistory} className={`py-2 px-4 rounded-md ${secondaryColor} border ${borderColor} hover:bg-gray-200`}>Clear History</button>
                   }
               </div>
            {error && <p className="text-red-500">{error}</p>}

                 <div className="flex gap-4">
                    <div>
                    <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700">Upload Image</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="image-upload"
                        className="mt-1 block w-full text-sm text-slate-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-indigo-50 file:text-indigo-700
                          hover:file:bg-indigo-100
                        "
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                     {currentImage && (
                          <img src={currentImage} alt="Uploaded" className="mt-2 max-w-xs max-h-32"  loading="lazy" />
                     )}
                    </div>
                    <div>
                     <label htmlFor="audio-upload" className="block text-sm font-medium text-gray-700">Upload Audio</label>
                        <input
                           ref={audioInputRef}
                           type="file"
                           id="audio-upload"
                           className="mt-1 block w-full text-sm text-slate-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-indigo-50 file:text-indigo-700
                          hover:file:bg-indigo-100
                        "
                           accept="audio/*"
                           onChange={handleAudioUpload}
                         />
                         {currentAudio && (
                             <audio src={currentAudio} controls className="mt-2 max-w-xs" />
                         )}
                     </div>
                </div>
        </div>

        {interpretations && Object.keys(interpretations).length > 0 && (
            <div className="mt-4">
                <h2 className="text-xl font-semibold mb-2">Interpretations</h2>
             <div className="flex gap-4">
              {Object.keys(interpretations).map((lang) =>(
                  <div key={lang} className="w-1/2">
                      <h3 className="text-lg font-semibold mb-2">Interpretations in {lang}</h3>
                    {interpretations[lang].length > 0 ? (
                        interpretations[lang].map((interpretation, index) => (
                         <div key={`${lang}-${index}`} className={`${secondaryColor} rounded-md p-4 mb-4 border ${borderColor}`}>
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium">
                                 Source: <span className="font-bold">{interpretation.source}</span>
                              </div>
                              <button className="bg-indigo-400 rounded-md px-2 py-1 hover:bg-indigo-600" onClick={() => handleCopy(interpretation.text)}>Copy</button>
                            </div>
                             <p className="mb-2">{interpretation.text}</p>
                              <div className="flex gap-2 items-center mb-2">
                                  <textarea className={`p-2 rounded-md ${primaryColor} border ${borderColor}`}
                                             rows={2} placeholder="Add Notes" value={interpretation.notes} onChange={(e) => handleNoteChange(e,index, interpretation.source)} />
                                   <button
                                        onClick={() => handleReactionClick(index, 'thumbsUp', interpretation.source)}
                                        className={`${interpretation.reactions.thumbsUp ? 'text-green-500': 'text-gray-500'} hover:text-green-700`}>
                                      👍
                                  </button>
                                <button
                                    onClick={() => handleReactionClick(index, 'thumbsDown', interpretation.source)}
                                    className={`${interpretation.reactions.thumbsDown ? 'text-red-500': 'text-gray-500'} hover:text-red-700`}>
                                     👎
                                 </button>
                               </div>
                          </div>
                       ))
                     ) : (
                        <p>No interpretations found in {lang}.</p>
                    )}

                  </div>
              ))}
             </div>
            </div>
        )}
      </main>
      <footer className={`p-4 text-center ${secondaryColor} border-t ${borderColor}`}>
       <p>&copy; 2024 Dream Interpreter</p>
      </footer>
    </div>
  );
};

export default DreamInterpreter;
