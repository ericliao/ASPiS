#include "ASPISMS.h"

#define BIG_STR 200

/*
  De-obfuscate a string using an input key - from obf.c
*/
void obfDecodeAttrByKey(char *in, char *key, char *out) {
/*
 Set up an array of characters that we will transpose.
*/
   MD5_CTX context;
   int wheel_len=26+26+10+15;
   int wheel[26+26+10+15];

   int i, j;
   unsigned char buffer[65]; /* each digest is 16 bytes, 4 of them */
   char keyBuf[BIG_STR];
   char *cpIn, *cpOut;
   unsigned char *cpKey;

   j=0;
   for (i=0;i<10;i++) wheel[j++]=(int)'0' + i;
   for (i=0;i<26;i++) wheel[j++]=(int)'A' + i;
   for (i=0;i<26;i++) wheel[j++]=(int)'a' + i;
   for (i=0;i<15;i++) wheel[j++]=(int)'!' + i;

   memset(keyBuf, 0, BIG_STR);
   strncpy(keyBuf, key, BIG_STR);

   memset(buffer, 0, 65);

/* 
  Get the MD5 digest of the key to get some bytes with many different values
*/
   MD5Init (&context);
   MD5Update (&context, (unsigned char*)keyBuf, BIG_STR);
   MD5Final (buffer, &context);

   MD5Init (&context);
   MD5Update (&context, buffer, 16);  /* MD5 of the MD5 */
   MD5Final (buffer+16, &context);

   MD5Init (&context);
   MD5Update (&context, buffer, 32);  /* MD5 of 2 MD5s */
   MD5Final (buffer+32, &context);

   MD5Init (&context);
   MD5Update (&context, buffer, 32);  /* MD5 of 2 MD5s */
   MD5Final (buffer+48, &context);

   cpIn=in;
   cpOut=out;
   cpKey=buffer;
   for (;;cpIn++) {
      int k, found;
      k = (int)*cpKey++;
      if (cpKey > buffer+60) cpKey=buffer;
      found=0;
      for (i=0;i<wheel_len;i++) {
	 if (*cpIn == (char)wheel[i]) {
	    j = i - k;
	    while (j<0) {
	       j+=wheel_len;
	    }
	    *cpOut++ = (char)wheel[j];
	    found = 1;
	    break;
	 }
      }
      if (found==0) {
	 if (*cpIn == '\0') {
	    *cpOut++ = '\0'; 
	    return;
	 }
	 else {*cpOut++=*cpIn;}
      }
   }
}

/*
 * appendFormattedStrToBBuf() - Appends a formatted string to a bytesBuf_t buffer. - from eraUtil.c
 * No more than size characters will be appended.
 * Allocates memory (or more memory) if the buffer is NULL or not large enough.
 * The buffer is treated as a string buffer.
 * Returns number of bytes written or a negative value upon failure.
 *
 */
int
appendFormattedStrToBBuf(bytesBuf_t *dest, size_t size, const char *format, ...)
{
	va_list ap;
	int written;
	size_t index=0;
	char *tmpPtr;

	/* Initial memory check */
	if (dest->buf==NULL) {
		dest->len=size+1;
		dest->buf=(char *)malloc(dest->len);
		memset(dest->buf, '\0', dest->len);
	}

	/* How much has already been written? */
	index = strlen((char *)dest->buf);
	
	/* Increase buffer size if needed */
	if (index+size >= dest->len) {
		dest->len=2*(index+size);
		tmpPtr=(char *)malloc(dest->len);
		memset(tmpPtr, '\0', dest->len);
		strcpy(tmpPtr, dest->buf);
		free(dest->buf);
		dest->buf=tmpPtr;
	}

	/* Append new string to previously written characters */
	va_start(ap, format);
	written=vsnprintf(((char *)dest->buf)+index, size, format, ap);
	va_end(ap);

	return (written);
}

/*
 * appendStrToBBuf() - Appends a string to a bytesBuf_t buffer. - from eraUtil.c
 * Returns number of bytes written or a negative value upon failure.
 *
 */
int
appendStrToBBuf(bytesBuf_t *dest, char *str)
{
	int written;
	
	if (str==NULL) {
		return (-1);
	}

	/* call appendFormattedStrToBBuf() */
	written = appendFormattedStrToBBuf(dest, strlen(str)+1, "%s", str);

	return (written);
}

/*
 * extractPSQueryResults() - Extracts AVU results from a genQueryOut_t  - from eraUtil.c
 * and writes them to a dynamic buffer in a pipe-separated, one AVU per line format.
 * To be used in msiGetDataObjPSmeta().
 */
int
extractPSQueryResults(int status, genQueryOut_t *genQueryOut, bytesBuf_t *mybuf, char *fullName)
{
   int printCount;
   int i, j;
   size_t size;


   printCount=0;

   if (status!=0) {
	rodsLog (LOG_ERROR, "extractPSQueryResults error: %d", status);
	return (status);
   }
   else {
      if (status !=CAT_NO_ROWS_FOUND) {
	     for (i=0;i<genQueryOut->rowCnt;i++) {
	     
	        //appendFormattedStrToBBuf(mybuf, strlen(fullName)+1, fullName);

	        for (j=0;j<genQueryOut->attriCnt;j++) {
		    char *tResult;
		    tResult = genQueryOut->sqlResult[j].value;
		    tResult += i*genQueryOut->sqlResult[j].len;
		
		    /* skip final | if no units were defined */
		    if (j<2 || strlen(tResult)) {
			    size = genQueryOut->sqlResult[j].len + 2;
			    appendFormattedStrToBBuf(mybuf, size, "|%s",tResult);
		    }
		
		    printCount++;
	        }

	        appendStrToBBuf(mybuf, "\n");

	     }
      }
   }

   return (printCount);
}

/*
 * Gets pipe separated metadata AVUs for a data object. - from eraUtil.c
 * 
 */
int
getDataObjPSmeta(char *objPath, bytesBuf_t *mybuf, rsComm_t *rsComm)
{
   genQueryInp_t genQueryInp;
   genQueryOut_t *genQueryOut;
   int i1a[10];
   int i1b[10];
   int i2a[10];
   char *condVal[10];
   char v1[MAX_NAME_LEN];
   char v2[MAX_NAME_LEN];
   char fullName[MAX_NAME_LEN];
   char myDirName[MAX_NAME_LEN];
   char myFileName[MAX_NAME_LEN];
   int printCount=0;
   int status;


   if (rsComm == NULL) {
	rodsLog (LOG_ERROR,
	  "getDataObjPSmeta: input rsComm is NULL");
	return (SYS_INTERNAL_NULL_INPUT_ERR);
   }

   
   memset (&genQueryInp, 0, sizeof (genQueryInp_t));

   i1a[0]=COL_META_DATA_ATTR_NAME;
   i1b[0]=0; /* currently unused */
   i1a[1]=COL_META_DATA_ATTR_VALUE;
   i1b[1]=0; /* currently unused */
   i1a[2]=COL_META_DATA_ATTR_UNITS;
   i1b[2]=0; /* currently unused */
   genQueryInp.selectInp.inx = i1a;
   genQueryInp.selectInp.value = i1b;
   genQueryInp.selectInp.len = 3;

   /* Extract cwd name and object name */
   strncpy(fullName, objPath, MAX_NAME_LEN);
   status = splitPathByKey(fullName, myDirName, myFileName, '/');

   i2a[0]=COL_COLL_NAME;
   sprintf(v1,"='%s'",myDirName);
   condVal[0]=v1;

   i2a[1]=COL_DATA_NAME;
   sprintf(v2,"='%s'",myFileName);
   condVal[1]=v2;


   genQueryInp.sqlCondInp.inx = i2a;
   genQueryInp.sqlCondInp.value = condVal;
   genQueryInp.sqlCondInp.len=2;

   genQueryInp.maxRows=10;
   genQueryInp.continueInx=0;
   genQueryInp.condInput.len=0;


   /* Actual query happens here */
   status = rsGenQuery(rsComm, &genQueryInp, &genQueryOut);


   if (status == CAT_NO_ROWS_FOUND) {
      i1a[0]=COL_D_DATA_PATH;
      genQueryInp.selectInp.len = 1;
      status = rsGenQuery(rsComm, &genQueryInp, &genQueryOut);
      if (status==0) {
	 /* printf("None\n"); */
	 return(0);
      }
      if (status == CAT_NO_ROWS_FOUND) {

	rodsLogAndErrorMsg (LOG_ERROR, &rsComm->rError, status,
          "getDataObjPSmeta: DataObject %s not found. status = %d", fullName, status);
	return (status);
      }
      printCount+=extractPSQueryResults(status, genQueryOut, mybuf, fullName);
   }
   else {
      printCount+=extractPSQueryResults(status, genQueryOut, mybuf, fullName);
   }

   while (status==0 && genQueryOut->continueInx > 0) {
      genQueryInp.continueInx=genQueryOut->continueInx;
      status = rsGenQuery(rsComm, &genQueryInp, &genQueryOut);
      printCount+= extractPSQueryResults(status, genQueryOut, mybuf, fullName);
   }

  return (status);
}

/*
 * Gets pipe separated metadata AVUs for a collection. - from eraUtil.c
 * 
 */
int
getCollectionPSmeta(char *objPath, bytesBuf_t *mybuf, rsComm_t *rsComm)
{
   genQueryInp_t genQueryInp;
   genQueryOut_t *genQueryOut;
   int i1a[10];
   int i1b[10];
   int i2a[10];
   char *condVal[10];
   char v1[MAX_NAME_LEN];
   int printCount=0;
   int status;



   if (rsComm == NULL) {
	rodsLog (LOG_ERROR,
	  "getCollectionPSmeta: input rsComm is NULL");
	return (SYS_INTERNAL_NULL_INPUT_ERR);
   }


   memset (&genQueryInp, 0, sizeof (genQueryInp_t));

   i1a[0]=COL_META_COLL_ATTR_NAME;
   i1b[0]=0; /* currently unused */
   i1a[1]=COL_META_COLL_ATTR_VALUE;
   i1b[1]=0;
   i1a[2]=COL_META_COLL_ATTR_UNITS;
   i1b[2]=0;
   genQueryInp.selectInp.inx = i1a;
   genQueryInp.selectInp.value = i1b;
   genQueryInp.selectInp.len = 3;

   i2a[0]=COL_COLL_NAME;
   sprintf(v1,"='%s'", objPath);
   condVal[0]=v1;

   genQueryInp.sqlCondInp.inx = i2a;
   genQueryInp.sqlCondInp.value = condVal;
   genQueryInp.sqlCondInp.len=1;

   genQueryInp.maxRows=10;
   genQueryInp.continueInx=0;
   genQueryInp.condInput.len=0;


   /* Actual query happens here */
   status = rsGenQuery(rsComm, &genQueryInp, &genQueryOut);

   if (status == CAT_NO_ROWS_FOUND) {
      i1a[0]=COL_COLL_COMMENTS;
      genQueryInp.selectInp.len = 1;
      status = rsGenQuery(rsComm, &genQueryInp, &genQueryOut);
      if (status==0) {
	    printf("None\n");
	 return(0);
      }
      if (status == CAT_NO_ROWS_FOUND) {

	rodsLogAndErrorMsg (LOG_ERROR, &rsComm->rError, status,
          "getCollectionPSmeta: Collection %s not found. status = %d", objPath, status);
	return (status);
      }
   }

   printCount+=extractPSQueryResults(status, genQueryOut, mybuf, objPath);

   while (status==0 && genQueryOut->continueInx > 0) {
      genQueryInp.continueInx=genQueryOut->continueInx;
      status = rsGenQuery(rsComm, &genQueryInp, &genQueryOut);
      printCount+= extractPSQueryResults(status, genQueryOut, mybuf, objPath);
   }

  return (status);

}

int msiIngestAttributeToREI(msParam_t *xattribute, ruleExecInfo_t *rei)
{
	char *attribute;
	
	attribute     = (char *) xattribute->inOutStruct;

	// copy attribute to the RuleExecInfo
	strncpy(rei->shibboleth, attribute, NAME_LEN);
	
	return 0;
}


int debugPrint(char *in1, char *in2)
{
	time_t curtime;
	struct tm *ptr;
	
    curtime = time(NULL);
	ptr = localtime(&curtime);
	rodsLog (LOG_NOTICE, "%s: %s \n", in1, in2);
	return 0;
}

int msiDebugPrint(msParam_t *variableIn, msParam_t *valueIn, ruleExecInfo_t *rei)
{
	int status;
	char *variable, *value;

	RE_TEST_MACRO ("    Calling msiDebugPrint");

	variable  = (char *) variableIn->inOutStruct;
    value  = (char *) valueIn->inOutStruct;
    status = debugPrint(variable, value);        

	return (status);
}

int compareAttributes(char *permission, char *entitlements)
{
    char *cp4, *current;
    const char entitlement_delimiter[] = ";";

    cp4 = strdup(entitlements);
    current = strtok(cp4, entitlement_delimiter);

    // compares multi-value attributes with permissions
    while (current != NULL)
    {
        if (strstr(permission, current) != NULL)
            return (1);
        current = strtok(NULL, entitlement_delimiter);
    }

    return (0);
}

int msiGetShibAttributes(msParam_t *userNameIn, msParam_t *attributesOut, ruleExecInfo_t *rei)
{
    char *userName, *attributes_in;
    int status;
    genQueryInp_t genQueryInp;
    genQueryOut_t genQueryOut;

    int iAttr[10];
    int iAttrVal[10] = {0,0,0,0,0};
    int iCond[10];
    char *condVal[10];
    char v1[BIG_STR];

    char buf0[BIG_STR];
    char buf1[BIG_STR];
    char buf2[BIG_STR];
    char decrypt_key[]="1gCBizHWbwIYyWLoysGzTe6SyzqFKMniZX05faZHWAwQKXf6Fs";

    RE_TEST_MACRO ("    Calling msiGetShibAttributes");

    userName = (char *) userNameIn->inOutStruct;
    
    // from rdaHighLevelRoutines.c + test_genq.c
    // runs a chlGenQuery to retrieve the user_info
    memset (&genQueryInp, 0, sizeof (genQueryInp_t));

    iAttr[0] = COL_USER_INFO;
    genQueryInp.selectInp.inx = iAttr;
    genQueryInp.selectInp.value = iAttrVal;
    genQueryInp.selectInp.len = 1;

    iCond[0] = COL_USER_NAME;
    sprintf(v1,"='%s'", userName);
    condVal[0] = v1;

    genQueryInp.sqlCondInp.inx = iCond;
    genQueryInp.sqlCondInp.value = condVal;
    genQueryInp.sqlCondInp.len = 1;

    genQueryInp.maxRows = 10;
    genQueryInp.continueInx = 0;

    status = chlGenQuery(genQueryInp, &genQueryOut);

    if (status < 0 ) { 
       if (status != CAT_NO_ROWS_FOUND) { 
	      rodsLog (LOG_NOTICE, 
		       "chlGenQuery for %s, status = %d", status);
       }
       return (status);
    }
    
    attributes_in = genQueryOut.sqlResult[0].value;       

    // decode attributes
    strncpy(buf0, attributes_in, BIG_STR);
    strncpy(buf1, decrypt_key, BIG_STR);
    obfDecodeAttrByKey(buf0, buf1, buf2);

    // fills in output parameter with user attributes
    fillStrInMsParam(attributesOut, buf2);   
    status = debugPrint("(1) user", userName);
    status = debugPrint("(2) got attributes", buf2);
	return (status); 
}

int msiGetObjectPermissions(msParam_t *invokingRuleIn, msParam_t *attributesIn, msParam_t *dataObjectIn, 
                            msParam_t *readPermOut, msParam_t *updatePermOut, msParam_t *deletePermOut, ruleExecInfo_t *rei)
{
    int status, readPermCount, updatePermCount, deletePermCount;
    char *invokingRule, *attributes, *dataObject, *parent;
    char *obj_perms, *obj_current, *this_perm;
    char *cp, *targetedId, *affiliation, *entitlement;
    char this_ent[25]; 
    char this_bools[25];
    char read_bool[6];
    char update_bool[6];
    char delete_bool[6];
    const char delimiter[] = "#";
    const char permission_delimiter[] = "\n";    

    bytesBuf_t *readPerm;
    bytesBuf_t *updatePerm;
    bytesBuf_t *deletePerm;
    bytesBuf_t *mybuf;

    RE_TEST_MACRO ("    Calling msiGetObjectPermissions");    

    invokingRule = (char *) invokingRuleIn->inOutStruct;
    attributes = (char *) attributesIn->inOutStruct;
    dataObject = (char *) dataObjectIn->inOutStruct;

    /* buffer init */
	mybuf = (bytesBuf_t *)malloc(sizeof(bytesBuf_t));
	memset (mybuf, 0, sizeof (bytesBuf_t));

    readPerm = (bytesBuf_t *)malloc(sizeof(bytesBuf_t));
	memset (readPerm, 0, sizeof (bytesBuf_t));
    updatePerm = (bytesBuf_t *)malloc(sizeof(bytesBuf_t));
	memset (updatePerm, 0, sizeof (bytesBuf_t));
    deletePerm = (bytesBuf_t *)malloc(sizeof(bytesBuf_t));
	memset (deletePerm, 0, sizeof (bytesBuf_t));
    
    // split the attributes string into targetedId, affiliation, entitlement
    if (strlen(attributes) > 0) {
        cp = strdup(attributes);
        targetedId = strtok(cp, delimiter);
        affiliation = strtok(NULL, delimiter);
        entitlement = strtok(NULL, delimiter);
    }
    else {
        entitlement = "null";
    }

    // retrieves the read/update/delete permission metadata
    //   example: |readPerm|elta,soapi|updatePerm|elta|deletePerm|elta
    //   based on imeta.c + eraMS.c + eraUtil.c

    // invoking rules
    // - acSetRescSchemeForCreate (upload/update)   - check for parent's 'update' permission
    // - acPreprocForDataObjOpen (download/read)    - check for 'read' permission of object
    // - acPreprocForDataObjOpen (upload/update)    - check for 'update' permission of object
    // - acDataDeletePolicy (delete)                - check for 'delete' permission

    if (strncmp(invokingRule, "acSetRescSchemeForCreate", 24) == 0) {
        // check for parent's permission metadata
        parent = dirname(dataObject);
        getCollectionPSmeta(parent, mybuf, rei->rsComm);
        rodsLog (LOG_NOTICE, "(3) got parent (%s) metadata", parent);
    }
    else {
        if (isColl(rei->rsComm, dataObject, NULL) < 0) {
            // it's a data object        
            getDataObjPSmeta(dataObject, mybuf, rei->rsComm);
            rodsLog (LOG_NOTICE, "(3) got data (%s) metadata", dataObject);
        }
        else {
            // it's a collection object
            getCollectionPSmeta(dataObject, mybuf, rei->rsComm);        
            rodsLog (LOG_NOTICE, "(3) got collection (%s) metadata", dataObject);            
        }
    }       

    readPermCount = 0;
    updatePermCount = 0;
    deletePermCount = 0;

    if (mybuf->buf == NULL)
    {
        appendStrToBBuf(readPerm, "invalid");
        appendStrToBBuf(updatePerm, "invalid");
        appendStrToBBuf(deletePerm, "invalid");

    } else {                
        obj_perms = strdup(mybuf->buf);
        obj_current = strtok(obj_perms, permission_delimiter);        

        while (obj_current != NULL) // while there are more entitlement|bool pairs
        {                       
            // do more parsing
            this_perm = strdup(obj_current);              
            sscanf(this_perm, "|%[^|]|%[^|]", this_ent, this_bools);
            
            // do even more parsing
            if (strstr(entitlement, this_ent)) // found entitlement
            {
                sscanf(this_bools, "%[^,],%[^,],%[^,]", read_bool, update_bool, delete_bool);

                if (strstr(read_bool, "true"))
                {
                    appendStrToBBuf(readPerm, this_ent);
                    appendStrToBBuf(readPerm, ",");
                    readPermCount++;                
                }
                if (strstr(update_bool, "true"))
                {
                    appendStrToBBuf(updatePerm, this_ent);
                    appendStrToBBuf(updatePerm, ",");
                    updatePermCount++;
                }
                if (strstr(delete_bool, "true"))
                {
                    appendStrToBBuf(deletePerm, this_ent);
                    appendStrToBBuf(deletePerm, ",");
                    deletePermCount++;
                }
            }
            obj_current = strtok(NULL, permission_delimiter);
        }        
        free(mybuf->buf);
    }        

    // if no valid user entitlements are found
    if (readPermCount == 0)
       appendStrToBBuf(readPerm, "invalid");
    if (updatePermCount == 0)
       appendStrToBBuf(updatePerm, "invalid"); 
    if (deletePermCount == 0)
       appendStrToBBuf(deletePerm, "invalid");  

    status = debugPrint("... read", readPerm->buf);
    status = debugPrint("... update", updatePerm->buf);
    status = debugPrint("... delete", deletePerm->buf);  

    // fills in output parameters with object permissions
    fillStrInMsParam(readPermOut, readPerm->buf);
    fillStrInMsParam(updatePermOut, updatePerm->buf); 
    fillStrInMsParam(deletePermOut, deletePerm->buf); 

    free(readPerm->buf);
    free(updatePerm->buf);
    free(deletePerm->buf);

    return (status); 
}

int msiCheckPermissions(msParam_t *attributesIn, msParam_t *readPermIn, msParam_t *updatePermIn, msParam_t *deletePermIn, 
                        msParam_t *invokingRuleIn, msParam_t *decisionOut, ruleExecInfo_t *rei)
{
    int status;
    char *cp, *invokingRule, *attributes, *decision;
    char *cp2, *targetedId, *affiliation, *entitlement, *user, *scope;
    char *readPerm, *updatePerm, *deletePerm;
    const char delimiter[] = "#";
    const char affiliation_delimiter[] = "@";

    RE_TEST_MACRO ("    Calling msiCheckPermissions");

    readPerm = (char *) readPermIn->inOutStruct;
    updatePerm = (char *) updatePermIn->inOutStruct;
    deletePerm = (char *) deletePermIn->inOutStruct;
    attributes = (char *) attributesIn->inOutStruct;
    invokingRule = (char *) invokingRuleIn->inOutStruct;

    // split the attributes string into targetedId, affiliation, entitlement
    if (strlen(attributes) > 0) {
        cp = strdup(attributes);
        targetedId = strtok(cp, delimiter);
        affiliation = strtok(NULL, delimiter);
        entitlement = strtok(NULL, delimiter);

        // split the affiliation into user and scope
        cp2 = strdup(affiliation);
        user = strtok(cp2, affiliation_delimiter);
        scope = strtok(NULL, affiliation_delimiter);
    }
    else {
        targetedId = "null";
        affiliation = "null";
        entitlement = "null";
        user = "null";
        scope = "null";
    }
    
    rodsLog (LOG_NOTICE, "(4) got user attributes");
    status = debugPrint("... targetedId", targetedId);
    status = debugPrint("... affiliation", affiliation);
    status = debugPrint("... entitlement", entitlement);    

    // compares the user attributes with the object metadata
    // splits the entitlement if it's multi-valued
    if (strncmp(affiliation, "null", 4) == 0) {
        // fail if no affiliation
        decision = "invalid_affiliation";
    }
    else if ((strncmp(user, "staff", 5) == 0) ||
            (strncmp(user, "employee", 8) == 0) ||
            (strncmp(user, "student", 7) == 0)) {
        // ok if staff or employee or student affiliation
        if ((strncmp(readPerm, "invalid", 7) == 0) ||
            (strncmp(updatePerm, "invalid", 7) == 0) ||
            (strncmp(deletePerm, "invalid", 7) == 0)) {
            decision = "invalid_perm";
        }
        else {
            if (strncmp(invokingRule, "acSetRescSchemeForCreate", 24) == 0) {
                // invoking: acSetRescSchemeForCreate
                if (compareAttributes(updatePerm, entitlement) == 0)
                    decision = "no_update_perm";
                else
                    decision = "valid_perm";
            }
            else if (strncmp(invokingRule, "acPreprocForDataObjOpen", 23) == 0) {
                // invoking: acPreprocForDataObjOpen
                if (compareAttributes(readPerm, entitlement) == 0)
                {
                    decision = "no_read_perm";
                } else if (compareAttributes(updatePerm, entitlement) == 0) {
                    decision = "no_update_perm";
                } else {
                    decision = "valid_perm"; 
                }
            }
            else if (strncmp(invokingRule, "acDataDeletePolicy", 18) == 0) {
                // invoking: acDataDeletePolicy
                if (compareAttributes(deletePerm, entitlement) == 0)
                    decision = "no_delete_perm";
                else
                    decision = "valid_perm";
            }
        }
    }
    else {
        // fail with other affiliations
        decision = "invalid_affiliation";
    }
 
    status = debugPrint("(5) made decision", decision);

    // fills in output parameter with authorization decision
    fillStrInMsParam(decisionOut, decision);  

	return (status); 
}

int msiEnforceAuthorizationDecision(msParam_t *userNameIn, msParam_t *dataObjectIn, 
                                    msParam_t *invokingRuleIn, msParam_t *decisionIn,
                                    msParam_t *logFileIn, ruleExecInfo_t *rei)
{
    int i;
    char *userName, *dataObject, *invokingRule, *decision, *logFile;

    RE_TEST_MACRO ("    Calling msiEnforceAuthorizationDecision");

    decision = (char *) decisionIn->inOutStruct;
    userName = (char *) userNameIn->inOutStruct;
    dataObject = (char *) dataObjectIn->inOutStruct;
    invokingRule = (char *) invokingRuleIn->inOutStruct;
    logFile = (char *) logFileIn->inOutStruct;

    if (strncmp(invokingRule, "acDataDeletePolicy", 18) == 0) {
        if (strncmp(decision, "no_delete_perm", 14) == 0 ||
            strncmp(decision, "invalid_perm", 12) == 0 ||
            strncmp(decision, "invalid_affiliation", 19) == 0) {
            rei->status = SYS_DELETE_DISALLOWED;
        }
        else {
           rei->status = 0; 
        }            
    } else {
        if (strncmp(decision, "invalid_affiliation", 19) == 0) {
            rei->status = SYS_USER_NOT_ALLOWED_TO_CONN; // need more error codes
        } else if (strncmp(decision, "invalid_perm", 12) == 0) {
                rei->status = SYS_NO_PATH_PERMISSION; // need more error codes
        } else if (strncmp(decision, "no_update_perm", 14) == 0) {
            rei->status = SYS_NO_DATA_OBJ_PERMISSION; // need more error codes
        } else if (strncmp(decision, "no_read_perm", 12) == 0) {
            rei->status = SYS_PROXYUSER_NO_PRIV; // need more error codes
        }
        else {
            rei->status = 0;
        }        
    }

    rodsLog (LOG_NOTICE, "(6) enforcement status: %d \n", rei->status);

    i = debugPrint("(7) logged access", logFile);
    i = debugPrint("... user", userName);
    i = debugPrint("... invoking rule", invokingRule);
    i = debugPrint("... data object", dataObject);
    rodsLog (LOG_NOTICE, "... access status: %d \n", rei->status);

	return (rei->status); 
}
