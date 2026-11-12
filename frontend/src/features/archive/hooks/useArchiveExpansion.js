export function useArchiveExpansion({
  expandedFacultyKeys,
  setExpandedFacultyKeys,
  expandFaculty,
  setExpandedSemesterKeys,
}) {
  const toggleFaculty = (facultyId) => {
    const open = expandedFacultyKeys.includes(facultyId);
    if (open) {
      setExpandedFacultyKeys((keys) => keys.filter((key) => key !== facultyId));
      return;
    }
    void expandFaculty(facultyId);
  };

  const toggleSemester = (facultyId, semesterId) => {
    setExpandedSemesterKeys((prev) => {
      const current = prev[facultyId] || [];
      const nextKeys = current.includes(semesterId)
        ? current.filter((key) => key !== semesterId)
        : [...current, semesterId];
      return { ...prev, [facultyId]: nextKeys };
    });
  };
  return { toggleFaculty, toggleSemester };
}
