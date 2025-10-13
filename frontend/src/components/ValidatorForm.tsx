'use client';

interface ValidatorFormProps {
  onSubmit: (url: string, claim: string) => void;
  isValidating: boolean;
}

export function ValidatorForm({ onSubmit, isValidating }: ValidatorFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const url = (form.elements.namedItem('url') as HTMLInputElement).value;
    const claim = (form.elements.namedItem('claim') as HTMLInputElement).value;
    onSubmit(url, claim);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mb-8">
      <div className="space-y-2">
        <label htmlFor="url" className="block font-bold">
          URL to Analyze 🌐
        </label>
        <input
          type="url"
          id="url"
          name="url"
          required
          placeholder="https://example.com/article"
          className="w-full p-3 border-2 border-black focus:outline-none focus:border-black bg-white"
          disabled={isValidating}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="claim" className="block font-bold">
          Claim to Verify ✍️
        </label>
        <textarea
          id="claim"
          name="claim"
          required
          rows={3}
          placeholder="Enter the claim you want to verify..."
          className="w-full p-3 border-2 border-black focus:outline-none focus:border-black bg-white resize-none"
          disabled={isValidating}
        />
      </div>

      <button
        type="submit"
        disabled={isValidating}
        className={`w-full p-3 bg-black text-white font-bold transition-opacity ${
          isValidating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
        }`}
      >
        {isValidating ? 'Validating...' : 'Validate Claim'}
      </button>
    </form>
  );
}
