import {
  Button,
  FormUI,
  Input,
  PlusIcon,
  useDesignSystemTheme,
} from '@databricks/design-system';
import { FormattedMessage } from 'react-intl';

const { TextArea } = Input;

interface EvaluationCreateRagRunBasicTabProps {
  setViewExamplesModalOpen: (isOpen: boolean) => void;
  promptTemplate: string;
  updatePromptTemplate: (prompt: string) => void;
  savePromptTemplateInputRef: (ref: any) => void;
  inputVariables: string[];
  inputVariableValues: Record<string, string>;
  updateInputVariableValue: (name: string, value: string) => void;
  handleAddVariableToTemplate: () => void;
}

export const EvaluationCreateRagRunBasicTab = ({
  setViewExamplesModalOpen,
  promptTemplate,
  updatePromptTemplate,
  savePromptTemplateInputRef,
  inputVariables,
  inputVariableValues,
  updateInputVariableValue,
  handleAddVariableToTemplate,
}: EvaluationCreateRagRunBasicTabProps) => {
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
            <Button
              componentId="codegen_mlflow_app_src_experiment-tracking_components_evaluation-artifacts-compare_evaluationcreatepromptrunmodal.tsx_695"
              onClick={() => setViewExamplesModalOpen(true)}
              style={{ marginLeft: 'auto' }}
              size="small"
            >
              <FormattedMessage
                defaultMessage="View Examples"
                description="Experiment page > new run modal > prompt examples button"
              />
            </Button>
          </div>
          <FormUI.Hint>
            <FormattedMessage
              defaultMessage={`Give instructions to the model. Use '{{ }}' or the "Add new variable" button to add variables to your prompt.`}
              description="Experiment Page > New Rag Run Modal > Prompt Template Input Hint"
            />
          </FormUI.Hint>
        </>

        <TextArea
          id="prompt_template"
          autoSize={{ minRows: 3 }}
          data-testid="prompt-template-input"
          value={promptTemplate}
          onChange={(e) => updatePromptTemplate(e.target.value)}
          ref={savePromptTemplateInputRef}
        />
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
          onClick={handleAddVariableToTemplate}
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
