import { render, screen } from '@testing-library/react';
import PRCard from '../PRCard.jsx';

describe('PRCard', () => {
  const baseData = {
    prId: 'org/repo#1',
    prUrl: 'https://github.com/org/repo/pull/1',
    repository: 'org/repo',
    prNumber: 1,
    title: 'Fix bug',
    status: 'open',
    priority: 'High',
    author: 'octocat',
    filesChanged: 3,
    additions: 20,
    deletions: 10,
    description: 'Detailed description'
  };

  it('renders key PR metadata', () => {
    render(<PRCard prData={baseData} />);

    expect(screen.getByText(/org\/repo/i)).toBeInTheDocument();
    expect(screen.getByText(/Fix bug/)).toBeInTheDocument();
    expect(screen.getByText(/High priority/)).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
    expect(screen.getByText('-10')).toBeInTheDocument();
  });

  it('calls delete handler when remove is clicked', () => {
    const handleDelete = vi.fn();
    render(<PRCard prData={baseData} onDelete={handleDelete} />);

    screen.getByRole('button', { name: /remove/i }).click();
    expect(handleDelete).toHaveBeenCalledWith('org/repo#1');
  });
});
