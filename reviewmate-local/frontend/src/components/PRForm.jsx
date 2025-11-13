import { useState } from 'react';
import { useForm } from 'react-hook-form';

const urlPattern = /github\.com\/[\w.-]+\/[\w.-]+\/pull\//i;

const PRForm = ({ onSubmit, disabled = false }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleFormSubmit = async (values) => {
    if (disabled) {
      setFormError('Please sign in before submitting PRs.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      await onSubmit(values);
      reset();
    } catch (error) {
      setFormError(error.message || 'Failed to submit PR');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="bg-rm-card/80 backdrop-blur rounded-2xl p-6 shadow-2xl space-y-4 border border-white/5"
    >
      <div>
        <label htmlFor="pr-url" className="block text-sm font-semibold uppercase tracking-wide text-white/70">PR URL</label>
        <input
          id="pr-url"
          type="url"
          placeholder="https://github.com/org/repo/pull/123"
          className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rm-accent"
          disabled={disabled || submitting}
          {...register('prUrl', {
            required: 'PR URL is required',
            validate: (value) => urlPattern.test(value) || 'Enter a valid GitHub PR URL'
          })}
        />
        {errors.prUrl && <p className="mt-1 text-sm text-rose-400">{errors.prUrl.message}</p>}
      </div>

      <div>
        <label htmlFor="github-token" className="block text-sm font-semibold uppercase tracking-wide text-white/70">GitHub Token (optional)</label>
        <input
          id="github-token"
          type="password"
          placeholder="ghp_xxxxxxxxx"
          className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rm-accent"
          disabled={disabled || submitting}
          {...register('githubToken')}
        />
        <p className="mt-1 text-xs text-white/50">Override your saved GitHub token for this PR if needed.</p>
      </div>

      {formError && <p className="text-sm text-rose-400">{formError}</p>}

      <button
        type="submit"
        disabled={submitting || disabled}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white shadow-lg shadow-cyan-500/30 hover:opacity-90 transition disabled:opacity-50"
      >
        {submitting ? 'Fetching PR…' : 'Fetch & Save PR'}
      </button>
    </form>
  );
};

export default PRForm;
