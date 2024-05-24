import {
  Button,
  FormUI,
  Input,
  PlusIcon,
  useDesignSystemTheme,
  MinusBoxIcon,
} from '@databricks/design-system';
import { FormattedMessage } from 'react-intl';

const { TextArea } = Input;

interface EvaluationCreateRagRunMultiPromptProps {
  promptTemplates: string[];
  updatePromptTemplates: (prompts: string[]) => void;
  savePromptTemplateInputRef: (ref: any) => void;
  inputVariables: string[];
  inputVariableValues: Record<string, string>;
  updateInputVariableValue: (name: string, value: string) => void;
  handleAddTemplates: () => void;
  handleAddVariableToTemplates: () => void;
}

export const EvaluationCreateRagRunMultiPromptTab = ({
  promptTemplates,
  updatePromptTemplates,
  savePromptTemplateInputRef,
  inputVariables,
  inputVariableValues,
  updateInputVariableValue,
  handleAddTemplates,
  handleAddVariableToTemplates,
}: EvaluationCreateRagRunMultiPromptProps) => {
  const { theme } = useDesignSystemTheme();
 
  return (
    <div>
      <div css={styles.formItem}>
        <>
          <div css={{ display: 'flex', justifyContent: 'space-between' }}>
            <FormUI.Label htmlFor="prompt_template">
              <FormattedMessage
                defaultMessage="Prompt Template"
                description="Experiment Page > New Rag Run Modal > Prompt Template Input Label"
              />
            </FormUI.Label>
          </div>
          <FormUI.Hint>
            <FormattedMessage
              defaultMessage={`Give instrupdatePromptTemplateuctions to the model. Use '{{ }}' or the "Add new variable" button to add variables to your prompt.`}
              description="Experiment Page > New Rag Run Modal > Prompt Template Input Hint"
            />
          </FormUI.Hint>
        </>
        {promptTemplates.map((promptTemplate, index) => (
          <>
            <div css={{ display: 'flex', justifyContent: 'space-between' }}>
              <TextArea
                id="prompt_template"
                autoSize={{ minRows: 3 }}
                data-testid="prompt-template-input"
                value={promptTemplate}
                onChange={(e) => updatePromptTemplates([...promptTemplates.slice(0, index), e.target.value, ...promptTemplates.slice(index + 1)])}
                ref={savePromptTemplateInputRef}
              />
              <div css={{ marginBottom: 2 * theme.spacing.md }}>
                {promptTemplates.length > 1 && (
                  <Button
                  componentId="codegen_mlflow_app_src_experiment-tracking_components_evaluation-artifacts-compare_evaluationcreatepromptrunmodal.tsx_736"
                  icon={<MinusBoxIcon />}
                  onClick={()=> {updatePromptTemplates([...promptTemplates.slice(0, index), ...promptTemplates.slice(index + 1)])}}
                  >
                  </Button>
                )}
              </div>
            </div>
          </>
        ))}
      </div>
      <div css={{ marginBottom: 2 * theme.spacing.md }}>
        <Button
          componentId="codegen_mlflow_app_src_experiment-tracking_components_evaluation-artifacts-compare_evaluationcreatepromptrunmodal.tsx_736"
          icon={<PlusIcon />}
          onClick={handleAddTemplates}
        >
          <FormattedMessage
            defaultMessage="Add new Prompt"
            description="Experiment Page > New Rag Run Modal > Prompt Template Input Label"
          />
        </Button>
      </div>
      {inputVariables.map((inputVariable) => (
        <div css={styles.formItem} key={inputVariable}>
          <>
            <FormUI.Label htmlFor={inputVariable}>
              <span>{inputVariable}</span>
            </FormUI.Label>
            <TextArea
              id={inputVariable}
              autoSize
              value={inputVariableValues[inputVariable] ? inputVariableValues[inputVariable] : ''}
              onChange={(e) => updateInputVariableValue(inputVariable, e.target.value)}
            />
          </>
        </div>
      ))}
      <div css={{ marginBottom: 2 * theme.spacing.md }}>
        <Button
          componentId="codegen_mlflow_app_src_experiment-tracking_components_evaluation-artifacts-compare_evaluationcreatepromptrunmodal.tsx_736"
          icon={<PlusIcon />}
          onClick={handleAddVariableToTemplates}
        >
          <FormattedMessage
            defaultMessage="Add new variable"
            description='Experiment Page > New Rag Run Modal > "Add New Variable" Button Label'
          />
        </Button>
      </div>
    </div>
  );
};


const styles = {
  formItem: { marginBottom: 16 },
};
