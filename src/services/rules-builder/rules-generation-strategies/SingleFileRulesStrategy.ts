import type { RulesGenerationStrategy } from '../RulesGenerationStrategy.ts';
import { Layer, Library, Stack } from '../../../data/dictionaries.ts';
import type { RulesContent } from '../RulesBuilderTypes.ts';
import {
  createProjectMarkdown,
  createEmptyProjectRulesContent,
  renderLibrarySection,
  iterateLayersStacksLibraries,
} from '../markdown-builders/index.ts';

/**
 * Strategy for single-file rules generation
 */
export class SingleFileRulesStrategy implements RulesGenerationStrategy {
  generateRules(
    projectName: string,
    projectDescription: string,
    selectedLibraries: Library[],
    stacksByLayer: Record<Layer, Stack[]>,
    librariesByStack: Record<Stack, Library[]>,
  ): RulesContent[] {
    if (selectedLibraries.length === 0) {
      return createEmptyProjectRulesContent(projectName, projectDescription);
    }

    const markdown =
      createProjectMarkdown(projectName, projectDescription) +
      this.generateLibraryMarkdown(stacksByLayer, librariesByStack);

    return [{ markdown, label: 'All Rules', fileName: 'rules.mdc' }];
  }

  private generateLibraryMarkdown(
    stacksByLayer: Record<Layer, Stack[]>,
    librariesByStack: Record<Stack, Library[]>,
  ): string {
    let markdown = '';
    let previousLayer = '';
    let previousStack = '';

    iterateLayersStacksLibraries({
      stacksByLayer,
      librariesByStack,
      onLibrary: (layer, stack, library) => {
        const includeLayerHeader = layer !== previousLayer;
        const includeStackHeader = stack !== previousStack;

        // Add spacing between stacks when not starting a new layer
        if (includeStackHeader && !includeLayerHeader && previousStack) {
          markdown += '\n';
        }

        markdown += renderLibrarySection({
          layer,
          stack,
          library,
          includeLayerHeader,
          includeStackHeader,
        });

        previousLayer = layer;
        previousStack = stack;
      },
    });

    return markdown;
  }
}
