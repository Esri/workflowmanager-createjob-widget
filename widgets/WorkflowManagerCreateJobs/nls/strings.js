define({
  root: ({
    _widgetLabel: "Workflow Manager (Classic) Create Job",
    title: "Create a Workflow Manager (Classic) Job",

    search: "Search",
    loading: "Loading ...",
    createNewSubmission: "Create a new submission",
    submitRequestForJobType: "Submit a request for {0}",

    notesLabel: "Comments",

    defaultDefineLOILabel: "Define Location",
    addFeature: "Add Feature",
    selectFeatures: "Select Features",
    aoiOverwritePrompt: "This will overwrite the current AOI.  Are you sure?",

    defaultExtPropsLabel: "Contact Information",

    defaultAttachmentsLabel: "Add Attachment",
    addAttachmentToJob: "Add an attachment to this job",
    fileTooLargeLabel: "Attachment file size exceeds limit, try a smaller file to add an attachment",
    processingFilename: "Processing {0} ...",
    successfulUploadAnother: "Successfully uploaded file! Upload another.",

    backBtnLabel: "Back",
    submitBtnLabel: "Submit",
    creatingJob: "Creating Job: {0}",
    submissionCreatedLabel: "Your submission is being created, this may take a moment.",

    jobCreatedSuccessfully: "{0} created successfully.",
    jobCreatedWithErrors: "Job {0} created, but not all job properties were updated: ",

    errorUnableToConnectToWMServer: "Unable to connect to Workflow Manager (Classic) Server: {0}. Please contact your Workflow Manager (Classic) administrator.",
    errorInvalidUserCredentials: "Unable to retrieve user credentials",
    errorUserInvalid: "User '{0}' is not a valid user in the Workflow Manager (Classic) system. Please contact your Workflow Manager (Classic) administrator.",
    errorUserNoVisibleJobTypes: "No visible job types returned for user '{0}'. Please contact your Workflow Manager (Classic) administrator.",
    errorRetrievingTableListMapping: "Unable to retrieve table list mappings. Please contact your Workflow Manager (Classic) administrator.",
    errorRetrievingTableListMappingForField: "Unable to retrieve table list mappings for {0}. Please contact your Workflow Manager (Classic) administrator.",
    errorRetrievingTableListValues: "Unable to retrieve table list values for {0}. Please contact your Workflow Manager (Classic) administrator.",
    errorUserNoCreateJobPrivilege: "User '{0}' does not have any privileges to create a job. Please contact your Workflow Manager (Classic) administrator.",
    errorCreatingJob: "Unable to create job: {0}",
    errorOverlappingAOI: "Unable to create job. Specified AOI overlaps with an existing job AOI.",
    errorUpdatingExtProps: "Unable to update job extended properties: {0}",

    errorNoSelectedFeatures: "No features were returned from selection",
    errorRetrievingSelectedFeatures: "Error retrieving selectable features: {0}",
    errorUnsupportedGeometryType: "Selected features returned unsupported geometry type: {0}"
  })
});
