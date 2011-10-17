# ASPiS

ASPiS aimed to address two complementary aspects of access management in iRODS:

* Access authorisation (AuthZ) that is based on user roles or attributes, managed in a distributed/federated manner, rather than on locally managed user lists, where access rights can be defined for individual files and modes of access (e.g. create, read, update, delete).

* Capture of audit and provenance information that tracks access to resources.

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
