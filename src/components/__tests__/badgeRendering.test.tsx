import React from 'react';
import renderer from 'react-test-renderer';
import { describe, it, expect } from 'vitest';
import { PromptGrid } from '../PromptGrid';

const sampleCategories = [
  { id: 'c1', name: 'General', icon: 'Code', color: '#8B5CF6', switchInstances: [{ switchId: 'note', value: { noteText: 'category note' }, enabled: true, scope: 'category', updatedAt: Date.now() }] }
];

const samplePrompts = [
  { id: 'p1', title: 'T1', description: 'D1', content: 'C1', tags: [], categoryId: 'c1', model: 'General', version: 1, versions: [], createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0, switchInstances: [{ switchId: 'note', value: { noteText: 'prompt note' }, enabled: true, scope: 'prompt', updatedAt: Date.now() }] }
];

describe('Badge rendering', () => {
  it('renders resolved badges snapshot', () => {
    const tree = renderer.create(
      <PromptGrid
        prompts={samplePrompts as any}
        categories={sampleCategories as any}
        onSelectPrompt={() => {}}
        onToggleFavorite={() => {}}
        onTogglePin={() => {}}
      />
    ).toJSON();

    expect(tree).toMatchSnapshot();
  });
});
