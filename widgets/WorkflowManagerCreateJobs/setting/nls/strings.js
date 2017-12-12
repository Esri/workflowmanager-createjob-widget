define({
  root: ({
    workflowManagerServiceUrl: "Workflow Manager Service URL",
    workflowManagerMapServiceUrl: "Workflow Manager Map Service URL",
    configureWorkflowManagerMapService: "Configure Workflow Manager Map Service",
    aoiOverlapUse: "(Required for disabling AOI overlap)",
    poiLayerId: "POI Layer Id",
    aoiLayerId: "AOI Layer Id",
    selectableLayer: "Selectable Map/Feature Service",
    selectLayerUrl: "Select Layer Url",
    wmxcomments: "Description/Notes",
    maxAttachmentSize: "Max Attachment Filesize (MB)",

    setSource:"Set",

    defaultUser: "Default User",
    nonAuthenticatedUser: "Non-Authenticated",
    portalAuthenticatedUser: "Portal Authenticated",
    serverAuthenticatedUser: "Server Authenticated",

    defaultUserPlaceholder: "Default username for submitting job requests",

    defineLOILabel: "Define Location Label",
    defaultDefineLOILabel: "Define Location",
    allowAttachmentsLabel: "Allow Attachments",
    attachmentsLabel: "Attachments Label",
    defaultAttachmentsLabel: "Add Attachment",
    extPropsLabel: "Extended Properties Label",
    defaultExtPropsLabel: "Contact Information",

    addJobTypeTip: "Add one or more job types to the widget and configure extended properties for each job type.",
    jobType: "Job Type",
    visible: "Visible",
    selectAnIcon: "Select an Icon:",

    tableName: "Table Name",
    fieldName: "Field Name",
    alias: "Alias",
    selectJobTypePlaceholder: "Select a job type",
    selectAJobType: "Select a job type to view extended properties",
    noExtendedProps: "There are no extended props for this job type",

    errorHeader: "An Error Occured",
    errorPlaceholder: "Something went wrong...",
    errorOk: "OK",
    errorInvalidServiceUrl: "Invalid service url entered.",
    errorInvalidMapServiceUrlOrLayerId: "Invalid Workflow Manager map service url or layer id(s) entered.",
    errorUnableToConnectToWMServer: "Unable to connect to Workflow Manager Server: {0}",
    errorNoJobTypesReturned: "No job types returned from Workflow Manager Server: {0}",
    errorNoActiveJobTypes: "No active job types found",
    errorInvalidUserCredentials: "Unable to retrieve user credentials",
    errorUserInvalid: "User '{0}' is not a valid user in the Workflow Manager system.",
    errorUserNoAdministratorPrivilege: "User {0} is not an administrator in the Workflow Manager system",
    errorRetrievingJobExtProperties: "Unable to retrieve any extended properties for job types: {0}"
  })
});
