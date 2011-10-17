# ASPiS
Architecture for a Shibboleth-Protected iRODS System

## What is this?

The ASPiS project has enhanced the access management functionality provided by [iRODS (Rule-Oriented Data management System)](http://www.irods.org), an open source data grid middleware system developed at the San Diego Supercomputer Center as the successor to the widely used Storage Resource Broker. Specifically, the project integrates Shibboleth-based access management with iRODS, which will provide a more scalable, flexible and user-friendly means of implementing authentication and authorisation, and allow iRODS based data grids to be deployed within the UK Access Management Federation. The system architecture can be seen [here](http://aspis.cerch.kcl.ac.uk/wp-uploads/2008/11/ASPiS3-1024x646.png).

## Components

### ASPIS
The ASPiS iRODS microservice which gets the Shibboleth attributes of the user and checks it against the object permissions to decide whether to allow/deny access.

### obf
The password obfuscation module for PHP to support Shibboleth authentication/authorization.

### prods
The PHP-iRODS API (from [extrods](http://code.google.com/p/extrods/) modified to support Shibboleth authentication/authorization.

### web2+
The PHP based iRODS Web Browser modified to allow access to iRODS using Shibboleth.

### aspis.irb
Example iRODS access rules incorporating the ASPIS Shibboleth microservice.
