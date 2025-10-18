"""
Complete Audio Analyzer - Local Solution
Analyzes speech, music, mood, and provides detailed audio features
"""

import os
import sys

# Add FFmpeg to PATH for this script
ffmpeg_path = r"C:\ffmpeg\bin"  # Or wherever ffmpeg.exe is located
if ffmpeg_path not in os.environ["PATH"]:
    os.environ["PATH"] = ffmpeg_path + os.pathsep + os.environ["PATH"]


import librosa
import numpy as np
import whisper
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

class LocalAudioAnalyzer:
    def __init__(self, whisper_model='base'):
        """
        Initialize local audio analyzer
        
        Args:
            whisper_model: 'tiny', 'base', 'small', 'medium', 'large'
                          (larger = more accurate but slower)
        """
        print(f"Loading Whisper model: {whisper_model}...")
        self.whisper_model = whisper.load_model(whisper_model)
        print("✓ Model loaded")
    
    def analyze_complete_audio(self, audio_path):
        """
        Complete audio analysis: transcription, music detection, mood, features
        
        Returns:
            dict with comprehensive audio analysis
        """
        print(f"\n🎵 Analyzing: {audio_path}\n")
        
        # Load audio
        y, sr = librosa.load(audio_path, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)
        
        print(f"Duration: {duration:.2f} seconds")
        
        # 1. Transcription (if speech is present)
        transcription = self._transcribe(audio_path)
        
        # 2. Detect if music or speech
        audio_type = self._detect_audio_type(y, sr)
        
        # 3. Extract audio features
        features = self._extract_features(y, sr)
        
        # 4. Mood analysis
        mood = self._analyze_mood(features)
        
        # 5. Music-specific analysis (if music detected)
        music_analysis = None
        if audio_type == 'music' or audio_type == 'mixed':
            music_analysis = self._analyze_music(y, sr)
        
        return {
            'audio_type': audio_type,
            'duration': duration,
            'transcription': transcription,
            'mood': mood,
            'features': features,
            'music_analysis': music_analysis,
            'summary': self._generate_summary(
                audio_type, mood, features, music_analysis, transcription
            )
        }
    
    def _transcribe(self, audio_path):
        """Transcribe speech using Whisper"""
        try:
            print("Transcribing...")
            result = self.whisper_model.transcribe(audio_path)
            print(f"✓ Transcription complete")
            return {
                'text': result['text'],
                'language': result['language'],
                'segments': len(result['segments'])
            }
        except Exception as e:
            print(f"⚠ Transcription error: {e}")
            return None
    
    def _detect_audio_type(self, y, sr):
        """Detect if audio is speech, music, or mixed"""
        # Extract features
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        
        # Calculate statistics
        zcr_mean = np.mean(zcr)
        sc_std = np.std(spectral_centroids)
        
        # Heuristic classification
        # Speech: higher zero-crossing rate, lower spectral variance
        # Music: lower zero-crossing rate, higher spectral variance
        
        if zcr_mean > 0.1 and sc_std < 1000:
            return 'speech'
        elif zcr_mean < 0.08 and sc_std > 1000:
            return 'music'
        else:
            return 'mixed'
    
    def _extract_features(self, y, sr):
        """Extract comprehensive audio features"""
        print("Extracting features...")
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
        
        # Rhythm features
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        
        # Timbre features
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        
        # Energy features
        rms = librosa.feature.rms(y=y)[0]
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        
        print("✓ Features extracted")
        
        return {
            'tempo': float(tempo),
            'beats_detected': len(beats),
            'spectral_centroid_mean': float(np.mean(spectral_centroids)),
            'spectral_centroid_std': float(np.std(spectral_centroids)),
            'spectral_rolloff_mean': float(np.mean(spectral_rolloff)),
            'spectral_bandwidth_mean': float(np.mean(spectral_bandwidth)),
            'rms_energy_mean': float(np.mean(rms)),
            'rms_energy_std': float(np.std(rms)),
            'zero_crossing_rate_mean': float(np.mean(zcr)),
            'mfcc_means': [float(np.mean(mfcc)) for mfcc in mfccs]
        }
    
    def _analyze_mood(self, features):
        """Analyze audio mood based on features"""
        tempo = features['tempo']
        energy = features['rms_energy_mean']
        spectral_centroid = features['spectral_centroid_mean']
        
        # Valence (happy vs sad) - based on spectral centroid and energy
        if spectral_centroid > 2000 and energy > 0.1:
            valence = 'positive'  # Bright, energetic
        elif spectral_centroid < 1500 and energy < 0.08:
            valence = 'negative'  # Dark, low energy
        else:
            valence = 'neutral'
        
        # Arousal (calm vs energetic) - based on tempo and energy
        if tempo > 120 or energy > 0.15:
            arousal = 'high'  # Energetic
        elif tempo < 90 and energy < 0.08:
            arousal = 'low'  # Calm
        else:
            arousal = 'medium'
        
        # Mood classification
        mood_map = {
            ('positive', 'high'): 'Happy/Energetic',
            ('positive', 'medium'): 'Content/Pleasant',
            ('positive', 'low'): 'Peaceful/Relaxed',
            ('neutral', 'high'): 'Excited/Tense',
            ('neutral', 'medium'): 'Neutral/Balanced',
            ('neutral', 'low'): 'Calm/Subdued',
            ('negative', 'high'): 'Angry/Aggressive',
            ('negative', 'medium'): 'Melancholic/Somber',
            ('negative', 'low'): 'Sad/Depressing'
        }
        
        mood = mood_map.get((valence, arousal), 'Unknown')
        
        return {
            'mood': mood,
            'valence': valence,
            'arousal': arousal,
            'tempo': tempo,
            'energy': energy
        }
    
    def _analyze_music(self, y, sr):
        """Music-specific analysis"""
        print("Analyzing music characteristics...")
        
        # Tempo and beats
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        
        # Key and tonality (approximate)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        key = np.argmax(np.sum(chroma, axis=1))
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        # Harmonic-percussive separation
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        
        # Instrumentalness (ratio of harmonic to percussive)
        harmonic_energy = np.sum(y_harmonic**2)
        percussive_energy = np.sum(y_percussive**2)
        total_energy = harmonic_energy + percussive_energy
        # Prevent division by zero
        instrumentalness = harmonic_energy / (total_energy + 1e-10) if total_energy > 0 else 0.5
        
        # Danceability (based on tempo and beat strength)
        beat_strength = librosa.feature.tempogram(y=y, sr=sr)
        danceability = float(np.mean(beat_strength))
        
        return {
            'tempo': float(tempo),
            'estimated_key': key_names[key],
            'beat_count': len(beats),
            'instrumentalness': float(instrumentalness),
            'danceability': float(danceability),
            'harmonic_ratio': float(harmonic_energy / (harmonic_energy + 1e-6))
        }
    
    def _generate_summary(self, audio_type, mood, features, music_analysis, transcription):
        """Generate human-readable summary"""
        summary = []
        
        # Audio type
        summary.append(f"📊 Audio Type: {audio_type.upper()}")
        
        # Mood
        summary.append(f"😊 Mood: {mood['mood']}")
        summary.append(f"   - Valence: {mood['valence']}")
        summary.append(f"   - Energy: {mood['arousal']}")
        
        # Tempo
        summary.append(f"🎵 Tempo: {features['tempo']:.1f} BPM")
        
        # Music details
        if music_analysis:
            summary.append(f"🎹 Key: {music_analysis['estimated_key']}")
            summary.append(f"💃 Danceability: {music_analysis['danceability']:.2f}")
            summary.append(f"🎸 Instrumentalness: {music_analysis['instrumentalness']:.2f}")
        
        # Transcription summary
        if transcription and transcription['text'].strip():
            summary.append(f"💬 Contains speech: {transcription['language']}")
            word_count = len(transcription['text'].split())
            summary.append(f"   - Word count: {word_count}")
        
        return '\n'.join(summary)
    
    def print_results(self, results):
        """Pretty print analysis results"""
        print("\n" + "="*60)
        print("AUDIO ANALYSIS RESULTS")
        print("="*60)
        
        print(f"\n{results['summary']}")
        
        if results['transcription'] and results['transcription']['text'].strip():
            print(f"\n📝 Transcription:")
            print(f"{results['transcription']['text'][:500]}...")
        
        print("\n" + "="*60)


# Example usage
if __name__ == "__main__":
    # Install required packages:
    # pip install librosa whisper openai-whisper numpy scipy
    
    analyzer = LocalAudioAnalyzer(whisper_model='base')
    
    # Analyze any audio file
    results = analyzer.analyze_complete_audio("C:\\Users\\sl\\Downloads\\test_audio.mp3")
    
    # Print results
    analyzer.print_results(results)
    
    # Access specific data
    print(f"\nMood: {results['mood']['mood']}")
    print(f"Tempo: {results['features']['tempo']:.1f} BPM")
    
    if results['music_analysis']:
        print(f"Key: {results['music_analysis']['estimated_key']}")