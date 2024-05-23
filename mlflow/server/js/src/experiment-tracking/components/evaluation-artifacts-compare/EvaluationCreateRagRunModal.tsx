import {
  Button,
  DialogCombobox,
  DialogComboboxContent,
  DialogComboboxHintRow,
  DialogComboboxOptionList,
  DialogComboboxOptionListSearch,
  DialogComboboxOptionListSelectItem,
  DialogComboboxTrigger,
  FormUI,
  Input,
  Modal,
  PlusIcon,
  Spinner,
  Tooltip,
  Typography,
  useDesignSystemTheme,
} from '@databricks/design-system';
import { compact } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import Utils from '../../../common/utils/Utils';
import { ThunkDispatch } from '../../../redux-types';
import { createRagLabRunApi } from '../../actions';
import { generateRandomRunName } from '../../utils/RunNameUtils';
import { useExperimentIds } from '../experiment-page/hooks/useExperimentIds';
import { useFetchExperimentRuns } from '../experiment-page/hooks/useFetchExperimentRuns';
import {
  compilePromptInputText,
} from '../prompt-engineering/PromptEngineering.utils';
import { EvaluationCreatePromptParameters } from './EvaluationCreatePromptParameters';
import { usePromptEvaluationInputValues } from './hooks/usePromptEvaluationInputValues';
import { usePromptEvaluationParameters } from './hooks/usePromptEvaluationParameters';
import { usePromptEvaluationPromptTemplateValue } from './hooks/usePromptEvaluationPromptTemplateValue';
import { EvaluationCreateRunPromptTemplateErrors } from './components/EvaluationCreateRunPromptTemplateErrors';
import type { RunRowType } from '../experiment-page/utils/experimentPage.row-types';
import { useExperimentPageViewMode } from '../experiment-page/hooks/useExperimentPageViewMode';
import { shouldEnableShareExperimentViewByTags } from '../../../common/utils/FeatureUtils';
import { searchAllPromptLabAvailableEndpoints } from '../../actions/PromptEngineeringActions';
import { EvaluationCreatePromptRunModalExamples } from './EvaluationCreatePromptRunModalExamples';  

const { TextArea } = Input;
type Props = {
  isOpen: boolean;
  closeModal: () => void;
  runBeingDuplicated: RunRowType | null;
  visibleRuns?: RunRowType[];
  refreshRuns: (() => Promise<never[]>) | (() => Promise<any> | null) | (() => void);
};

export const EvaluationCreateRagRunModal = ({
  isOpen,
  closeModal,
  runBeingDuplicated,
  visibleRuns = [],
  refreshRuns: refreshRunsFromProps,
}: Props): JSX.Element => {
  const usingNewViewStateModel = shouldEnableShareExperimentViewByTags();
  const [experimentId] = useExperimentIds();
  const { theme } = useDesignSystemTheme();
  const { parameters, updateParameter } = usePromptEvaluationParameters();
  const [, setViewMode] = useExperimentPageViewMode();
  const [selectedPlatforms, updateSelectedPlatforms] = useState<string[]>([]);
  const [selectedModels, updateSelectedModels] = useState<string[]>([]);
  const [newExperimentName, setNewExperimentName] = useState('');
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const [vectorStoreCollectionName, updateVectorStoreCollectionName] = useState('');
  const [isViewExamplesModalOpen, setViewExamplesModalOpen] = useState(false);

  const dispatch = useDispatch<ThunkDispatch>();

  useEffect(() => {
    dispatch(searchAllPromptLabAvailableEndpoints()).catch((e) => {
      Utils.logErrorAndNotifyUser(e?.message || e);
    });
  }, [dispatch]);

  const intl = useIntl();

  const {
    updateInputVariables,
    inputVariables,
    inputVariableValues,
    updateInputVariableValue,
    inputVariableNameViolations,
  } = usePromptEvaluationInputValues();

  const { handleAddVariableToTemplate, savePromptTemplateInputRef, promptTemplate, updatePromptTemplate } =
    usePromptEvaluationPromptTemplateValue();

  useEffect(() => {
    if (isOpen) {
      setNewExperimentName(generateRandomRunName());
    }
  }, [isOpen]);

  useEffect(() => {
    updateInputVariables(promptTemplate);
  }, [promptTemplate, updateInputVariables]);


  const platformList = ['openai', 'huggingface', 'alphacode', 'azure', 'google', 'aws'];

  const modelList = {
    'gpt-3.5-turbo': ['openai', 'azure'],
    'gpt-4': ['openai', 'azure'],
    transformer: ['huggingface'],
    'alpha-llm': ['alphacode'],
    gemini: ['google'],
    bedrock: ['aws'],
  };

  const selectModelList = Object.entries(modelList)
    .filter(([model, platforms]) => selectedPlatforms.some((platform) => platforms.includes(platform)))
    .flatMap(([model]) => model);

  // In the next version, routes are already filtered
  const supportedPlatformRouteListUnified = useMemo(() => platformList, [platformList]);

  const supportedModelRouteListUnified = useMemo(() => selectModelList, [selectModelList]);

  // Determines if model gateway routes are being loaded

  const { refreshRuns: refreshRunsFromContext, updateSearchFacets } = useFetchExperimentRuns();

  /**
   * If the view is using the new view state model, let's use the function for refreshing runs from props.
   * TODO: Remove this once we migrate to the new view state model
   */
  const refreshRuns = usingNewViewStateModel ? refreshRunsFromProps : refreshRunsFromContext;

  const onHandleSubmit = () => {
    setIsCreatingRun(true);

    const modelRouteNamesOfPlatform: { [key: string]: string[] } = Object.entries(modelList).reduce(
      (acc: { [key: string]: string[] }, [model, platforms]) => {
        platforms.forEach((platform) => {
          if (selectedPlatforms.includes(platform) && selectedModels.includes(model)) {
            if (!acc.hasOwnProperty(platform)) {
              acc[platform] = [model];
            } else {
              acc[platform].push(model);
            }
          }
        });
        return acc;
      },
      {},
    );

    const modelParameters = { ...parameters }; // array index 수정 필요

    const modelInput = compilePromptInputText(promptTemplate, inputVariableValues);
    dispatch(
      createRagLabRunApi({
        experimentId,
        modelRouteNamesOfPlatform,
        modelParameters,
        promptTemplate,
        promptParameters: inputVariableValues,
        experimentName: newExperimentName,
        modelInput,
        vectorStoreCollectionName: vectorStoreCollectionName,
      }),
    )
      .then(() => {
        refreshRuns();
        closeModal();
        setIsCreatingRun(false);

        // Use modernized function for changing view mode if flag is set
        if (usingNewViewStateModel) {
          setViewMode('ARTIFACT');
        } else {
          // If the view if not in the "evaluation" mode already, open it
          updateSearchFacets((currentState) => {
            if (currentState.compareRunsMode !== 'ARTIFACT') {
              return { ...currentState, compareRunsMode: 'ARTIFACT' };
            }
            return currentState;
          });
        }
      })
      .catch((e) => {
        Utils.logErrorAndNotifyUser(e?.message || e);
        // NB: Not using .finally() due to issues with promise implementation in the Jest
        setIsCreatingRun(false);
      });
  };

  const selectPlatformLabel = intl.formatMessage({
    defaultMessage: 'Served Platform',
    description: 'Experiment page > new run modal > served Platform endpoint label',
  });

  const selectPlatformPlaceholder = intl.formatMessage({
    defaultMessage: 'Select Platform endpoint',
    description: 'Experiment page > new run modal > served Platform endpoint placeholder',
  });

  const selectModelLabel = intl.formatMessage({
    defaultMessage: 'Served LLM model',
    description: 'Experiment page > new run modal > served LLM model endpoint label',
  });
  const selectModelPlaceholder = intl.formatMessage({
    defaultMessage: 'Select LLM model endpoint',
    description: 'Experiment page > new run modal > served LLM model endpoint placeholder',
  });

  const promptTemplateProvided = promptTemplate.trim().length > 0;
  const allInputValuesProvided = useMemo(
    () => inputVariables.every((variable) => inputVariableValues[variable]?.trim()),
    [inputVariables, inputVariableValues],
  );

  const experimentNameProvided = newExperimentName.trim().length > 0;

  // We can evaluate if we have selected model, prompt template and all input values.
  // It should be possible to evaluate without input variables for the purpose of playing around.

  // We can log the run if we have: selected model, prompt template, all input values,
  // output that is present and up-to-date. Also, in order to log the run, we should have at least
  // one input variable defined (otherwise prompt engineering won't make sense).
  const createRunButtonEnabled = Boolean(
    selectedModels &&
      promptTemplateProvided &&
      allInputValuesProvided &&
      inputVariables.length > 0 &&
      experimentNameProvided,
  );

  // Let's prepare a proper tooltip content for every scenario
  const createRunButtonTooltip = useMemo(() => {
    if (!selectedModels) {
      return intl.formatMessage({
        defaultMessage: 'You need to select a served model endpoint using dropdown first',
        description: 'Experiment page > new run modal > invalid state - no model endpoint selected',
      });
    }
    if (!promptTemplateProvided) {
      return intl.formatMessage({
        defaultMessage: 'You need to provide a prompt template',
        description: 'Experiment page > new run modal > invalid state - no prompt template provided',
      });
    }
    if (!allInputValuesProvided) {
      return intl.formatMessage({
        defaultMessage: 'You need to provide values for all defined inputs',
        description: 'Experiment page > new run modal > invalid state - no prompt inputs provided',
      });
    }
    if (inputVariables.length === 0) {
      return intl.formatMessage({
        defaultMessage: 'You need to define at least one input variable',
        description: 'Experiment page > new run modal > invalid state - no input variables defined',
      });
    }
    if (!experimentNameProvided) {
      return intl.formatMessage({
        defaultMessage: 'Please provide run name',
        description: 'Experiment page > new run modal > invalid state - no run name provided',
      });
    }
    return null;
  }, [
    allInputValuesProvided,
    inputVariables.length,
    intl,
    promptTemplateProvided,
    selectedModels,
    experimentNameProvided,
  ]);

  if (isOpen && isViewExamplesModalOpen) {
    return (
      <EvaluationCreatePromptRunModalExamples
        isOpen={isOpen && isViewExamplesModalOpen}
        closeExamples={() => setViewExamplesModalOpen(false)}
        closeModal={closeModal}
        updatePromptTemplate={updatePromptTemplate}
        updateInputVariableValue={updateInputVariableValue}
      />
    );
  }

  const findPlatformNamesByModel = (modelRoute: string) => {
    let platformName = '';

    Object.entries(modelList).forEach(([model, platforms]) => {
      platforms.forEach((platform) => {
        if (selectedPlatforms.includes(platform) && model === modelRoute) {
          if (platformName !== '') {
            platformName += ', ' + platform;
          } else {
            platformName = platform;
          }
        }
      });
    });
    return platformName;
  };

  const getRoutePlatformOptionList = () => {
    return supportedPlatformRouteListUnified.map((platformRoute) => (
      <DialogComboboxOptionListSelectItem
        value={platformRoute}
        key={platformRoute}
        onChange={(value) => {
          const isSelected = selectedPlatforms.includes(value);

          const updatedPlatforms = isSelected 
            ? selectedPlatforms.filter((platform) => platform !== value) 
            : [...selectedPlatforms, value];

          updateSelectedPlatforms(updatedPlatforms);

          if (isSelected) {
            const updateModels = selectedModels.filter((model) => findPlatformNamesByModel(model) !== value);
            updateSelectedModels(updateModels);
          } 
        }}
        checked={selectedPlatforms.includes(platformRoute)}
      >
        {platformRoute}
      </DialogComboboxOptionListSelectItem>
    ));
  };


  const getRouteOptionList = () => {
    return supportedModelRouteListUnified.map((modelRoute) => (
      <DialogComboboxOptionListSelectItem
        value={modelRoute}
        key={modelRoute}
        onChange={(value) => {
          const isSelected = selectedModels.includes(value);

          const updatedModels = isSelected
            ? selectedModels.filter((model) => model !== value)
            : [...selectedModels, value];

          updateSelectedModels(updatedModels);
        }}
        checked={selectedModels.includes(modelRoute)}
      >
        {modelRoute}
        {modelRoute && <DialogComboboxHintRow>{findPlatformNamesByModel(modelRoute)}</DialogComboboxHintRow>}
      </DialogComboboxOptionListSelectItem>
    ));
  };

  return (
    <Modal
      verticalSizing="maxed_out"
      visible={isOpen}
      onCancel={closeModal}
      onOk={closeModal}
      footer={
        <div css={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
          <Button
            componentId="codegen_mlflow_app_src_experiment-tracking_components_evaluation-artifacts-compare_evaluationcreatepromptrunmodal.tsx_589"
            onClick={closeModal}
          >
            <FormattedMessage
              defaultMessage="Cancel"
              description="Experiment page > new run modal > cancel button label"
            />
          </Button>
          <Tooltip title={createRunButtonTooltip}>
            <Button
              componentId="codegen_mlflow_app_src_experiment-tracking_components_evaluation-artifacts-compare_evaluationcreatepromptrunmodal.tsx_596"
              onClick={onHandleSubmit}
              data-testid="button-create-run"
              type="primary"
              disabled={!createRunButtonEnabled}
            >
              <FormattedMessage
                defaultMessage="Create run"
                description='Experiment page > new run modal > "Create run" confirm button label'
              />
            </Button>
          </Tooltip>
        </div>
      }
      title={
        <div>
          <Typography.Title level={2} css={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
            <FormattedMessage defaultMessage="New run" description="Experiment page > new run modal > modal title" />
          </Typography.Title>
          <Typography.Hint css={{ marginTop: 0, fontWeight: 'normal' }}>
            Create a new run using a large-language model by giving it a prompt template and model parameters
          </Typography.Hint>
        </div>
      }
      dangerouslySetAntdProps={{ width: 1200 }}
    >
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: 48,
        }}
      >
        <div>
          <FormUI.Label htmlFor="selected_platform" css={{ marginBottom: theme.spacing.sm }}>
            {selectPlatformLabel}
          </FormUI.Label>
          <div css={{ marginBottom: theme.spacing.lg, display: 'flex', alignItems: 'center' }}>
            <DialogCombobox
              label={selectPlatformLabel}
              modal={false}
              value={selectedPlatforms ? selectedPlatforms : undefined}
              multiSelect
              stayOpenOnSelection
            >
              <DialogComboboxTrigger
                id="selected_platform"
                css={{ width: '100%' }}
                allowClear={false}
                placeholder={selectPlatformPlaceholder}
                withInlineLabel={false}
              />
              <DialogComboboxContent maxHeight={400} matchTriggerWidth>
                  <DialogComboboxOptionList>
                    <DialogComboboxOptionListSearch autoFocus>
                      {getRoutePlatformOptionList()}
                    </DialogComboboxOptionListSearch>
                  </DialogComboboxOptionList>
              </DialogComboboxContent>
            </DialogCombobox>
          </div>
          <FormUI.Label htmlFor="selected_model" css={{ marginBottom: theme.spacing.sm }}>
            {selectModelLabel}
          </FormUI.Label>
          <div css={{ marginBottom: theme.spacing.lg, display: 'flex', alignItems: 'center' }}>
            <DialogCombobox
              label={selectModelLabel}
              modal={false}
              value={selectedModels ? selectedModels : undefined}
              multiSelect
              stayOpenOnSelection
            >
              <DialogComboboxTrigger
                id="selected_model"
                css={{ width: '100%' }}
                allowClear={false}
                placeholder={selectModelPlaceholder}
                withInlineLabel={false}
              />
              <DialogComboboxContent maxHeight={400} matchTriggerWidth>
                  <DialogComboboxOptionList>
                    <DialogComboboxOptionListSearch autoFocus>{getRouteOptionList()}</DialogComboboxOptionListSearch>
                  </DialogComboboxOptionList>
              </DialogComboboxContent>
            </DialogCombobox>
          </div>
          {selectedModels && (
            <EvaluationCreatePromptParameters parameters={parameters} updateParameter={updateParameter} />
          )}
          <div css={styles.formItem}>
            <>
              <FormUI.Label htmlFor="new_experiment_name">
                <FormattedMessage
                  defaultMessage="New experiment name"
                  description="Experiment Page > New Rag Run Modal > experiment Name Input Label"
                />
                {!newExperimentName.trim() && (
                  <FormUI.Message
                    type="error"
                    message={intl.formatMessage({
                      defaultMessage: 'Please provide experiment name',
                      description: 'Experiment Page > New Rag Run Modal > Invalid State - No experiment Name Provided',
                    })}
                  />
                )}
              </FormUI.Label>
              <Input
                id="new_experiment_name"
                data-testid="experiment-name-input"
                required
                value={newExperimentName}
                onChange={(e) => setNewExperimentName(e.target.value)}
              />
            </>
          </div>
        </div>
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
            <EvaluationCreateRunPromptTemplateErrors violations={inputVariableNameViolations} />
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
          <div css={styles.formItem}>
            <>
              <div css={{ display: 'flex', justifyContent: 'space-between' }}>
                <FormUI.Label htmlFor="vector_store_collection_name">
                  <FormattedMessage
                    defaultMessage="Vector Store Collection Name"
                    description="Experiment Page > New Rag Run Modal > Vector Store Collection Name Input Label"
                  />
                </FormUI.Label>
              </div>
              <FormUI.Hint>
                <FormattedMessage
                  defaultMessage={`Enter the name of the vector store collection to use for the model output`}
                  description="Experiment Page > New Rag Run Modal > Vector Store Collection Name Input Hint"
                />
              </FormUI.Hint>
            </>

            <TextArea
              id="vector_store_collection_name"
              autoSize
              data-testid="vector-store-collection-name-input"
              value={vectorStoreCollectionName}
              onChange={(e) => updateVectorStoreCollectionName(e.target.value)}
            />
            <EvaluationCreateRunPromptTemplateErrors violations={inputVariableNameViolations} />
          </div>
        </div>
      </div>
      {isCreatingRun && (
        // Scrim overlay
        <div
          css={{
            inset: 0,
            backgroundColor: theme.colors.overlayOverlay,
            position: 'absolute',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <Spinner />
        </div>
      )}
    </Modal>
  );
};

const styles = {
  formItem: { marginBottom: 16 },
};
