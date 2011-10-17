
/* ASPISMS.h - header file for ASPISMS.c
 */

#include <stdio.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdarg.h>
#include <libgen.h>
#include "reGlobalsExtern.h"
#include "simpleQuery.h"
#include "icatHighLevelRoutines.h"
#include "objMetaOpr.h"
#include "genQuery.h"

// ASPiS microservices
int debugPrint(char *in1, char *in2);
int msiDebugPrint(msParam_t *variableIn, msParam_t *valueIn, ruleExecInfo_t *rei);
int msiIngestAttributeToREI(msParam_t *xattribute, ruleExecInfo_t *rei);

int msiGetShibAttributes(msParam_t *userNameIn, msParam_t *attributesOut, ruleExecInfo_t *rei);
int msiGetObjectPermissions(msParam_t *invokingRuleIn, msParam_t *attributesIn, msParam_t *dataObjectIn, 
                            msParam_t *readPermOut, msParam_t *updatePermOut, msParam_t *deletePermOut, ruleExecInfo_t *rei);
int msiCheckPermissions(msParam_t *attributesIn, msParam_t *readPermIn, msParam_t *updatePermIn, msParam_t *deletePermIn, 
                        msParam_t *invokingRuleIn, msParam_t *decisionOut, ruleExecInfo_t *rei);
int msiEnforceAuthorizationDecision(msParam_t *userNameIn, msParam_t *dataObjectIn, msParam_t *invokingRuleIn, msParam_t *decisionIn, msParam_t *logFileIn, ruleExecInfo_t *rei);
