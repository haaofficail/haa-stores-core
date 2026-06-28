import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflowFiles = [
  '.github/workflows/ops-staging-bullmq-check.yml',
  '.github/workflows/ops-staging-env.yml',
  '.github/workflows/ops-staging-migrate.yml',
];

function read(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');
}

describe('owner-triggered ops workflows avoid shell interpolation of inputs', () => {
  it.each(workflowFiles)('%s has no github/input expression directly inside run scripts', (path) => {
    const source = read(path);

    expect(source).not.toContain('if [ "${{ inputs.target }}" = "production" ]');
    expect(source).not.toContain("RUN_ID='${{ github.run_id }}'");
    expect(source).not.toContain("DRY_RUN='${{ inputs.dry_run }}'");
    expect(source).not.toContain('echo "::add-mask::${{ inputs.value }}"');
  });

  it('base64-encodes arbitrary env values before passing them through ssh command assignments', () => {
    const source = read('.github/workflows/ops-staging-env.yml');

    expect(source).toContain('ENV_VALUE_B64="$(printf');
    expect(source).toContain("ENV_VALUE_B64='$ENV_VALUE_B64'");
    expect(source).toContain('ENV_VALUE="$(printf');
    expect(source).not.toContain("ENV_VALUE='$ENV_VALUE'");
  });
});
