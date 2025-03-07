from deep_translator import GoogleTranslator
import sys
import json

def chunk_text(text, max_length=4500):
    """Split text into chunks that won't exceed Google Translate's limit."""
    if len(text) <= max_length:
        return [text]
    
    chunks = []
    current_chunk = ""
    
    # Split by sentences to maintain context
    sentences = text.split('.')
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) < max_length:
            current_chunk += sentence + "."
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + "."
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def translate_text(text, target_language, to_english=False):
    try:
        # Initialize the translator with appropriate source and target languages
        if to_english:
            translator = GoogleTranslator(source=target_language, target='en')
        else:
            translator = GoogleTranslator(source='en', target=target_language)
        
        # Split text into chunks if it's too long
        chunks = chunk_text(text)
        translated_chunks = []
        
        # Translate each chunk
        for chunk in chunks:
            try:
                translated = translator.translate(chunk)
                translated_chunks.append(translated)
            except Exception as chunk_error:
                print(f"Error translating chunk: {str(chunk_error)}", file=sys.stderr)
                translated_chunks.append(chunk)  # Keep original text if translation fails
        
        # Join the translated chunks
        final_translation = ' '.join(translated_chunks)
        
        # Return the result as JSON
        result = {
            'success': True,
            'translated_text': final_translation,
            'direction': 'to_english' if to_english else 'from_english'
        }
        return json.dumps(result)
        
    except Exception as e:
        # Return error as JSON
        result = {
            'success': False,
            'error': str(e)
        }
        return json.dumps(result)

if __name__ == '__main__':
    # Read input from command line arguments
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Invalid number of arguments. Usage: python translator.py "text" "target_language" [to_english]'
        }))
        sys.exit(1)
        
    text = sys.argv[1]
    target_language = sys.argv[2]
    to_english = len(sys.argv) > 3 and sys.argv[3].lower() == 'true'
    
    # Perform translation and print result
    print(translate_text(text, target_language, to_english))