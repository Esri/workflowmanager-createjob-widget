# ⛔ ArcGIS Workflow Manager (Classic) has been deprecated
Learn more about the [deprecation of ArcGIS Workflow Manager (Classic)](https://support.esri.com/en-us/knowledge-base/arcgis-workflow-manager-classic-deprecation-000031190) and the new [service-based ArcGIS Workflow Manager](https://www.esri.com/en-us/arcgis/products/arcgis-workflow-manager/overview)

## ArcGIS Workflow Manager (Classic) Create Job Widget

The ArcGIS Workflow Manager (Classic) Create Job widget enables users to integrate [ArcGIS Workflow Manager (Classic) Server](https://enterprise.arcgis.com/en/workflow-manager/) functionality within 
their own applications created in Web AppBuilder for ArcGIS. It is designed so users can configure 
and deploy the widget and create jobs in ArcGIS Workflow Manager (Classic) easily and quickly. Source code is provided for 
developers who would like to customize the widget.

![App](create-job-widget.png)

## Features
* Ready-to-deploy Workflow Manager (Classic) widget for Web AppBuilder for ArcGIS.
  * [Web AppBuilder Portal Edition](http://enterprise.arcgis.com/en/portal/latest/use/welcome.htm)
  * [Web AppBuilder Developer Edition](https://developers.arcgis.com/web-appbuilder/)
* Easily configurable to meet custom business needs and requirements - no programming skills required to deploy.

### Supported Workflow Manager (Classic) Versions
The widget works with ArcGIS Workflow Manager (Classic) Server 10.4+ versions.

### Current Limitations:

* Extended property types that are not supported include geographic dataset, domains, and multi-level table list. These properties are hidden in the widget configuration page.
* Job extended properties can be updated in the widget, but not the default properties.  Jobs are created with default properties configured in the job type, such as assignment and dates.  
* Cannot define job location of interest (LOI) with buffer.
* IE11 cannot display job type icons in the widget.
 
### Supported Browsers

The Workflow Manager (Classic) Create Job widget supports the following browsers:
* Chrome
* Firefox
* Internet Explorer 11+
* Edge

## Instructions

1. Fork and then clone the repo. 
2. Deploy the widget to Web AppBuilder for ArcGIS following the 
[deployment and configuration instructions](README_CONFIG.md).

## Requirements

The Workflow Manager (Classic) Create Job widget can be used in the following Web AppBuilder for ArcGIS environments:
* [Web AppBuilder Portal Edition](http://enterprise.arcgis.com/en/portal/latest/use/welcome.htm)
* [Web AppBuilder Developer Edition](https://developers.arcgis.com/web-appbuilder/)

## Resources

* [ArcGIS Workflow Manager (Classic) for Server](https://enterprise.arcgis.com/en/workflow-manager)
* [ArcGIS Workflow Manager (Classic) Discussion on GeoNet](https://geonet.esri.com/community/gis/solutions/workflow-manager)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).

## Licensing
Copyright 2017 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt]( https://raw.github.com/Esri/quickstart-map-js/master/license.txt) file.
