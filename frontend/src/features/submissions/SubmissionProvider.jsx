import { useI18n } from "../../i18n/I18nProvider";
import { translateApiMessage } from "../../i18n/api";
import { SubmissionContext } from "./SubmissionContext";
import SubmissionDialogs from "./components/SubmissionDialogs";
import { useReviewState } from "./hooks/useReviewState.js";
import { useSubmissionState } from "./hooks/useSubmissionState.js";
import { useSubmissionSchema } from "./hooks/useSubmissionSchema.jsx";
import { useSubmissionPermissions } from "./hooks/useSubmissionPermissions.js";
import { useSubmissionData } from "./hooks/useSubmissionData.js";
import { useReviewQueues } from "./hooks/useReviewQueues.js";
import { useSubmissionFilters } from "./hooks/useSubmissionFilters.js";
import { useFileAccess } from "./hooks/useFileAccess.js";
import { useSubmissionSelection } from "./hooks/useSubmissionSelection.js";
import { useSubmissionMutations } from "./hooks/useSubmissionMutations.js";
import { useReviewActions } from "./hooks/useReviewActions.js";
import { useSubmissionColumns } from "./hooks/useSubmissionColumns.jsx";
import { useSubmissionLifecycle } from "./hooks/useSubmissionLifecycle.js";

export default function SubmissionProvider({ auth, children }) {
  const { t, lang } = useI18n();
  const tr = (value) => translateApiMessage(value, t);
  const session = { auth, t, lang, tr };
  const reviewState = useReviewState();
  const reviewModel = { ...session, ...reviewState };
  const submissionState = useSubmissionState();
  const stateModel = { ...reviewModel, ...submissionState };
  const submissionSchema = useSubmissionSchema(stateModel);
  const schemaModel = { ...stateModel, ...submissionSchema };
  const submissionPermissions = useSubmissionPermissions(schemaModel);
  const permissionsModel = { ...schemaModel, ...submissionPermissions };
  const submissionData = useSubmissionData(permissionsModel);
  const dataModel = { ...permissionsModel, ...submissionData };
  const reviewQueues = useReviewQueues(dataModel);
  const queuesModel = { ...dataModel, ...reviewQueues };
  const submissionFilters = useSubmissionFilters(queuesModel);
  const filtersModel = { ...queuesModel, ...submissionFilters };
  const fileAccess = useFileAccess(filtersModel);
  const filesModel = { ...filtersModel, ...fileAccess };
  const submissionSelection = useSubmissionSelection(filesModel);
  const selectionModel = { ...filesModel, ...submissionSelection };
  const submissionMutations = useSubmissionMutations(selectionModel);
  const mutationsModel = { ...selectionModel, ...submissionMutations };
  const reviewActions = useReviewActions(mutationsModel);
  const actionsModel = { ...mutationsModel, ...reviewActions };
  const submissionColumns = useSubmissionColumns(actionsModel);
  const workspaceModel = { ...actionsModel, ...submissionColumns };
  useSubmissionLifecycle(workspaceModel);
  return (
    <SubmissionContext.Provider value={workspaceModel}>
      {children}
      <SubmissionDialogs />
    </SubmissionContext.Provider>
  );
}
