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
  Spinner,
  Tooltip,
  Typography,
  useDesignSystemTheme,
  Tabs,
} from '@databricks/design-system';
import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
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
import type { RunRowType } from '../experiment-page/utils/experimentPage.row-types';
import { useExperimentPageViewMode } from '../experiment-page/hooks/useExperimentPageViewMode';
import { shouldEnableShareExperimentViewByTags } from '../../../common/utils/FeatureUtils';
import { searchAllPromptLabAvailableEndpoints } from '../../actions/PromptEngineeringActions';
import { EvaluationCreatePromptRunModalExamples } from './EvaluationCreatePromptRunModalExamples';  
import { EvaluationCreateRagRunBasicTab } from './components/EvaluationCreateRagRunBasicTab';
import { EvaluationCreateRagRunMultiPromptTab } from './components/EvaluationCreateRagRunMultiPromptTab';
import { usePromptEvaluationInputValuesForMultiPrompt } from './hooks/usePromptEvaluationInputValuesForMultiPrompt';

const { TextArea } = Input;
type Props = {
  isOpen: boolean;
  closeModal: () => void;
  runBeingDuplicated: RunRowType | null;
  visibleRuns?: RunRowType[];
  refreshRuns: (() => Promise<never[]>) | (() => Promise<any> | null) | (() => void);
};

type Model = {
  model_uuid: string;
  model_name: string;
  platforms: string;
}

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
  const [selectedModels, updateSelectedModels] = useState<Model[]>([]);
  const [newExperimentName, setNewExperimentName] = useState('');
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const [vectorStoreCollectionName, updateVectorStoreCollectionName] = useState('');
  const [isViewExamplesModalOpen, setViewExamplesModalOpen] = useState(false);
  const [tabKey, setTabKey] = useState('basic');

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
  } = usePromptEvaluationInputValues();

  const { 
    handleAddVariableToTemplate, 
    savePromptTemplateInputRef, 
    promptTemplate, 
    updatePromptTemplate,
    promptTemplates,  
    updatePromptTemplates, 
    handleAddTemplates,
    handleAddVariableToTemplates, 
  } =
    usePromptEvaluationPromptTemplateValue();

  const {
      inputVariablesForMultiPrompt,
      inputVariableValuesForMultiPrompt,
      updateInputVariableValueForMultiPrompt,
      updateInputVariablesForPromptTemplates,
    } = usePromptEvaluationInputValuesForMultiPrompt();

  useEffect(() => {
    if (isOpen) {
      setNewExperimentName(generateRandomRunName());
    }
  }, [isOpen]);

  useEffect(() => {
    updateInputVariables(promptTemplate);
  }, [promptTemplate, updateInputVariables]);


  useEffect(() => {
    updateInputVariablesForPromptTemplates(promptTemplates);
  }, [promptTemplates, updateInputVariablesForPromptTemplates]);

  const platformList = ['openai', 'huggingface', 'alphacode', 'azure', 'google', 'aws'];

  const modelList: Model[] = [
    {
      model_uuid: '1',
      model_name: 'gpt-3.5-turbo',
      platforms: 'openai',
    },
    {
      model_uuid: '2',
      model_name: 'gpt-4',
      platforms: 'openai',
    },
    {
      model_uuid: '3',
      model_name: 'gpt-3.5-turbo',
      platforms: 'azure',
    },
    {
      model_uuid: '4',
      model_name: 'gpt-4',
      platforms: 'azure',
    },
    {
      model_uuid: '5',
      model_name: 'transformer',
      platforms: 'huggingface',
    },
    {
      model_uuid: '6',
      model_name: 'alpha-llm',
      platforms: 'alphacode',
    },
    {
      model_uuid: '7',
      model_name: 'gemini',
      platforms: 'google',
    },
    {
      model_uuid: '8',
      model_name: 'bedrock',
      platforms: 'aws',
    }
  ]
  const selectModelList = modelList.filter(item => selectedPlatforms.includes(item.platforms))

  // In the next version, routes are already filtered
  const supportedPlatformRouteListUnified = platformList

  const supportedModelRouteListUnified = selectModelList

  // Determines if model gateway routes are being loaded

  const { refreshRuns: refreshRunsFromContext, updateSearchFacets } = useFetchExperimentRuns();

  /**
   * If the view is using the new view state model, let's use the function for refreshing runs from props.
   * TODO: Remove this once we migrate to the new view state model
   */
  const refreshRuns = usingNewViewStateModel ? refreshRunsFromProps : refreshRunsFromContext;

  const onHandleSubmit = () => {
    setIsCreatingRun(true);

    const modelRouteNamesOfPlatform: { [key: string]: string[] } = selectedModels.reduce((acc: { [key: string]: string[] }, { model_name, platforms }) => {
      if (!acc[platforms]) {
        acc[platforms] = [];
      }
      acc[platforms].push(model_name);
      return acc;
    }
    , {});

    const modelParameters = { ...parameters }; // array index 수정 필요

    const modelInputs = tabKey === 'basic' 
    ? [compilePromptInputText(promptTemplate, inputVariableValues)] : promptTemplates.map((template) => compilePromptInputText(template, inputVariableValuesForMultiPrompt));
    const prompts = tabKey === 'basic' ? [promptTemplate] : promptTemplates;
    const promptParameters = tabKey === 'basic' ? inputVariableValues : inputVariableValuesForMultiPrompt;

    dispatch(
      createRagLabRunApi({
        experimentId,
        modelRouteNamesOfPlatform,
        modelParameters,
        promptTemplate: prompts,
        promptParameters: promptParameters,
        experimentName: newExperimentName,
        modelInput: modelInputs,
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

  const allInputValuesProvidedForMultiPrompt = useMemo(
    () => inputVariablesForMultiPrompt.every((variable) => inputVariableValuesForMultiPrompt[variable]?.trim()),
    [inputVariablesForMultiPrompt, inputVariableValuesForMultiPrompt],
  );

  const experimentNameProvided = newExperimentName.trim().length > 0;

  // We can evaluate if we have selected model, prompt template and all input values.
  // It should be possible to evaluate without input variables for the purpose of playing around.

  // We can log the run if we have: selected model, prompt template, all input values,
  // output that is present and up-to-date. Also, in order to log the run, we should have at least
  // one input variable defined (otherwise prompt engineering won't make sense).

  const createRunButtonEnabledByselectedModels = Boolean(
    selectedModels.length > 0
  )
  const createRunButtonEnabled = Boolean(
      promptTemplateProvided &&
      tabKey === 'basic' ? allInputValuesProvided : allInputValuesProvidedForMultiPrompt &&
      inputVariables.length > 0 &&
      experimentNameProvided,
  );

  // Let's prepare a proper tooltip content for every scenario
  const createRunButtonTooltip = useMemo(() => {
    if (selectedModels.length === 0) {
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
    if (!allInputValuesProvided && tabKey === 'basic') {
      return intl.formatMessage({
        defaultMessage: 'You need to provide values for all defined inputs',
        description: 'Experiment page > new run modal > invalid state - no prompt inputs provided',
      });
    }
    if (!allInputValuesProvidedForMultiPrompt && tabKey === 'multi-prompt') {
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
    tabKey,
    allInputValuesProvidedForMultiPrompt,
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
            const updateModels = selectedModels.filter((model) => model.platforms !== value);
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
        value={modelRoute.model_uuid}
        key={modelRoute.model_uuid}
        onChange={(value) => {
          const isSelected = selectedModels.some((model) => model.model_uuid === value);

          const updatedModels = isSelected
            ? selectedModels.filter((model) => model.model_uuid !== value)
            : [...selectedModels, modelRoute];

          updateSelectedModels(updatedModels);
        }}
        checked={selectedModels.some((model) => model.model_uuid === modelRoute.model_uuid)}
      >
        {modelRoute.model_name}
        {modelRoute.model_name && <DialogComboboxHintRow>{modelRoute.platforms}</DialogComboboxHintRow>}
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
              disabled={!createRunButtonEnabled || !createRunButtonEnabledByselectedModels}
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
              value={selectedModels ? selectedModels.map((model)=> model.model_name) : undefined}
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
          <div css={styles.formItem}>
            <>
              <FormUI.Label htmlFor="vector_store_collection_name">
              <FormattedMessage
                    defaultMessage="Vector Store Collection Name"
                    description="Experiment Page > New Rag Run Modal > Vector Store Collection Name Input Label"
                  />
                {!newExperimentName.trim() && (
                  <FormUI.Message
                    type="error"
                    message={intl.formatMessage({
                      defaultMessage: 'Enter the name of the vector store collection to use for the model output',
                      description: 'Experiment Page > New Rag Run Modal > Vector Store Collection Name Input Hint',
                    })}
                  />
                )}
              </FormUI.Label>
              <Input
                id="vector_store_collection_name"
                data-testid="vector-store-collection-name-input"
                required
                value={vectorStoreCollectionName}
                onChange={(e) => updateVectorStoreCollectionName(e.target.value)}
              />
            </>
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
      <Tabs
      onChange={(key) => setTabKey(key)}
      >
        <Tabs.TabPane tab="Basic" key="basic">
          <EvaluationCreateRagRunBasicTab
            setViewExamplesModalOpen={setViewExamplesModalOpen}
            promptTemplate={promptTemplate}
            updatePromptTemplate={updatePromptTemplate}
            savePromptTemplateInputRef={savePromptTemplateInputRef}
            inputVariables={inputVariables}
            inputVariableValues={inputVariableValues}
            updateInputVariableValue={updateInputVariableValue}
            handleAddVariableToTemplate={handleAddVariableToTemplate}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Multi Prompt" key="multi-prompt">
          <EvaluationCreateRagRunMultiPromptTab 
            promptTemplates={promptTemplates}
            updatePromptTemplates={updatePromptTemplates}
            savePromptTemplateInputRef={savePromptTemplateInputRef}
            inputVariables={inputVariablesForMultiPrompt}
            inputVariableValues={inputVariableValuesForMultiPrompt}
            updateInputVariableValue={updateInputVariableValueForMultiPrompt}
            handleAddTemplates={handleAddTemplates}
            handleAddVariableToTemplates={handleAddVariableToTemplates}
          />
        </Tabs.TabPane>
      </Tabs>
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
