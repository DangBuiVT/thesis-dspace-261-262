import ReviewWorkspace from "../workflow/ReviewWorkspace.jsx";
import { useSubmissions } from "../SubmissionContext.jsx";

export default function SubmissionDetail({ record }) {
  const { auth, configurableFormFields } = useSubmissions();
  return (
    record && (
      <ReviewWorkspace
        key={record.id}
        submission={record}
        auth={auth}
        fields={configurableFormFields}
      />
    )
  );
}
