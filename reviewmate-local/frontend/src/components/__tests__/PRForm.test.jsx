import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PRForm from '../PRForm.jsx';

describe('PRForm', () => {
  it('submits valid data', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue();

    render(<PRForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/PR URL/i), 'https://github.com/org/repo/pull/5');
    await user.type(screen.getByLabelText(/GitHub Token/i), 'token');

    await user.click(screen.getByRole('button', { name: /fetch/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      prUrl: 'https://github.com/org/repo/pull/5',
      githubToken: 'token'
    });
  });

  it('shows validation error for invalid URL', async () => {
    const user = userEvent.setup();
    render(<PRForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText(/PR URL/i), 'https://example.com/invalid');
    await user.type(screen.getByLabelText(/GitHub Token/i), 'token');
    await user.click(screen.getByRole('button', { name: /fetch/i }));

    expect(await screen.findByText(/valid GitHub PR URL/i)).toBeInTheDocument();
  });
});
