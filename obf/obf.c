#ifdef HAVE_CONFIG_H
#include "config.h"
#endif

#include "php.h"
#include "php_obf.h"

static function_entry obf_functions[] = {
    PHP_FE(obf_password, NULL)
    PHP_FE(encode_attributes, NULL)
    {NULL, NULL, NULL}
};

zend_module_entry obf_module_entry = {
#if ZEND_MODULE_API_NO >= 20010901
    STANDARD_MODULE_HEADER,
#endif
    PHP_OBF_EXTNAME,
    obf_functions,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
#if ZEND_MODULE_API_NO >= 20010901
    PHP_OBF_VERSION,
#endif
    STANDARD_MODULE_PROPERTIES
};

#ifdef COMPILE_DL_OBF
ZEND_GET_MODULE(obf)
#endif


/*
    Obfuscate a string using an input key - from obf.c
*/
void obfEncodeByKey(char *in, char *key, char *out) {
    /*
     Set up an array of characters that we will transpose.
    */
    MD5_CTX context;

    int wheel_len=26+26+10+15;
    int wheel[26+26+10+15];

    int i, j;
    unsigned char buffer[65]; /* each digest is 16 bytes, 4 of them */
    char keyBuf[100];
    char *cpIn, *cpOut;
    unsigned char *cpKey;

    j=0;
    for (i=0;i<10;i++) wheel[j++]=(int)'0' + i;
    for (i=0;i<26;i++) wheel[j++]=(int)'A' + i;
    for (i=0;i<26;i++) wheel[j++]=(int)'a' + i;
    for (i=0;i<15;i++) wheel[j++]=(int)'!' + i;

    memset(keyBuf, 0, 100);
    strncpy(keyBuf, key, 100);
    memset(buffer, 0, 17);

    /* 
      Get the MD5 digest of the key to get some bytes with many different values
    */

    MD5Init (&context);
    MD5Update (&context, (unsigned char*)keyBuf, 100);
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
	            j = i + k;
	            j = j % wheel_len;
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
    Obfuscate a string using an input key - from obf.c
*/
void obfEncodeAttrByKey(char *in, char *key, char *out) {
    /*
     Set up an array of characters that we will transpose.
    */
    MD5_CTX context;

    int wheel_len=26+26+10+15;
    int wheel[26+26+10+15];

    int i, j;
    unsigned char buffer[65]; /* each digest is 16 bytes, 4 of them */
    char keyBuf[200];
    char *cpIn, *cpOut;
    unsigned char *cpKey;

    j=0;
    for (i=0;i<10;i++) wheel[j++]=(int)'0' + i;
    for (i=0;i<26;i++) wheel[j++]=(int)'A' + i;
    for (i=0;i<26;i++) wheel[j++]=(int)'a' + i;
    for (i=0;i<15;i++) wheel[j++]=(int)'!' + i;

    memset(keyBuf, 0, 200);
    strncpy(keyBuf, key, 200);
    memset(buffer, 0, 17);

    /* 
      Get the MD5 digest of the key to get some bytes with many different values
    */

    MD5Init (&context);
    MD5Update (&context, (unsigned char*)keyBuf, 200);
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
	            j = i + k;
	            j = j % wheel_len;
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

PHP_FUNCTION(encode_attributes)
{
    char *attribute_in;
    int attribute_in_len;    
    char *encode_key;
    int encode_key_len;
    char buf0[300];
    char buf1[300];
    char buf2[300];

    if (zend_parse_parameters(ZEND_NUM_ARGS() TSRMLS_CC, "ss", &encode_key, &encode_key_len, &attribute_in, &attribute_in_len) == FAILURE) {
        RETURN_NULL();
    }

    strncpy(buf0, attribute_in, 300);
    strncpy(buf1, encode_key, 300);
    obfEncodeAttrByKey(buf0, buf1, buf2);

    RETURN_STRING(buf2, 1);
}

PHP_FUNCTION(obf_password)
{
    /* set user password code - source: iadmin.c */    
    char buf0[MAX_PASSWORD_LEN + 10];
    char buf1[MAX_PASSWORD_LEN + 10];
    char buf2[MAX_PASSWORD_LEN + 10];
    char *password;
    int password_len;
    char *admin_key;
    int admin_key_len;
    
    int i, len, lcopy;
    struct stat statbuf;
    
    /* this is a random string used to pad, arbitrary, but must match the server side: */
    char rand[]="1gCBizHWbwIYyWLoysGzTe6SyzqFKMniZX05faZHWAwQKXf6Fs"; 

    if (zend_parse_parameters(ZEND_NUM_ARGS() TSRMLS_CC, "ss", &admin_key, &admin_key_len, &password, &password_len) == FAILURE) {
        RETURN_NULL();
    }

    strncpy(buf0, password, MAX_PASSWORD_LEN);
    len = strlen(password);
    lcopy = MAX_PASSWORD_LEN-10-len;
    if (lcopy > 15) {  /* server will look for 15 characters of random string */
        strncat(buf0, rand, lcopy);
    }    
    
    strncpy(buf1, admin_key, MAX_PASSWORD_LEN);
    obfEncodeByKey(buf0, buf1, buf2);

    RETURN_STRING(buf2, 1);
}
