import React, { useContext, useMemo, useState } from 'react';
import { RunRowType } from '../utils/experimentPage.row-types';
import { EvaluationCreateRagRunModal } from '../../evaluation-artifacts-compare/EvaluationCreateRagRunModal';
import { shouldEnablePromptLab } from '../../../../common/utils/FeatureUtils';

const CreateNewRagRunContext = React.createContext<{
  createNewRagRun: (runToDuplicate?: RunRowType) => void;
}>({
  createNewRagRun: () => {},
});

/**
 * A thin context wrapper dedicated to invoke "create run" modal in various areas of the experiment runs page UI
 */
export const CreateNewRagRunContextProvider = ({
  children,
  visibleRuns,
  refreshRuns,
}: {
  children: React.ReactNode;
  visibleRuns: RunRowType[];
  refreshRuns: (() => Promise<never[]>) | (() => Promise<any> | null) | (() => void);
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [runBeingDuplicated, setRunBeingDuplicated] = useState<RunRowType | null>(null);

  const contextValue = useMemo(
    () => ({
      createNewRagRun: (runToDuplicate?: RunRowType) => {
        setIsOpen(true);
        setRunBeingDuplicated(runToDuplicate || null);
      },
    }),
    [],
  );

  return (
    <CreateNewRagRunContext.Provider value={contextValue}>
      {children}
      {shouldEnablePromptLab() && (
        <EvaluationCreateRagRunModal
          visibleRuns={visibleRuns}
          isOpen={isOpen}
          closeModal={() => setIsOpen(false)}
          runBeingDuplicated={runBeingDuplicated}
          refreshRuns={refreshRuns}
        />
      )}
    </CreateNewRagRunContext.Provider>
  );
};

export const useCreateNewRagRun = () => useContext(CreateNewRagRunContext);
