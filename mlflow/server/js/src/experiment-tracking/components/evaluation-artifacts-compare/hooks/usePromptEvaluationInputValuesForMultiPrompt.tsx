import { useCallback, useMemo, useState } from 'react';
import { debounce, fromPairs, isEqual } from 'lodash';
import {
  DEFAULT_PROMPTLAB_INPUT_VALUES,
  extractPromptInputVariables,
  getPromptInputVariableNameViolations,
} from '../../prompt-engineering/PromptEngineering.utils';

export const usePromptEvaluationInputValuesForMultiPrompt = () => {
  const [inputVariablesForMultiPrompt, updateInputVariablesDirect] = useState<string[]>(extractPromptInputVariables(''));

  const [inputVariableNameViolationsForMultiPrompt, setInputVariableNameViolations] = useState<
    ReturnType<typeof getPromptInputVariableNameViolations>
  >({ namesWithSpaces: [] });

  const [inputVariableValuesForMultiPrompt, updateInputVariableValues] =
    useState<Record<string, string>>(DEFAULT_PROMPTLAB_INPUT_VALUES);

  const clearInputVariableValuesForMultiPrompt = useCallback(() => updateInputVariableValues({}), []);

  const updateInputVariableValueForMultiPrompt = useCallback((name: string, value: string) => {
    updateInputVariableValues((values) => ({ ...values, [name]: value }));
  }, []);

  // Sanitize the variable dictionary so only actually used variables
  // will be returned (discard leftovers from previous prompt templates)
  const sanitizedInputVariableValues = useMemo(
    () => fromPairs(Object.entries(inputVariableValuesForMultiPrompt).filter(([key]) => inputVariablesForMultiPrompt.includes(key))),
    [inputVariableValuesForMultiPrompt, inputVariablesForMultiPrompt],
  );

  const updateInputVariablesForPromptTemplates = useMemo(
    () =>
      debounce((promptTemplates: string[]) => {
        const newInputVariables = promptTemplates.map((promptTemplate) => extractPromptInputVariables(promptTemplate));
        const newInputVariablesFlattened = newInputVariables.flat();
        const uniqueNewInputVariables = Array.from(new Set(newInputVariablesFlattened));
        updateInputVariablesDirect((currentInputVariables) => {
          if (!isEqual(uniqueNewInputVariables, currentInputVariables)) {
            return uniqueNewInputVariables;
          }
          return currentInputVariables;
        });
      }, 250),
    [],
  );


  return {
    inputVariablesForMultiPrompt,
    inputVariableValuesForMultiPrompt: sanitizedInputVariableValues,
    updateInputVariableValueForMultiPrompt,
    inputVariableNameViolationsForMultiPrompt,
    clearInputVariableValuesForMultiPrompt,
    updateInputVariablesForPromptTemplates,
  };
};
