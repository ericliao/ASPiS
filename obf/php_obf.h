#ifndef PHP_OBF_H
#define PHP_OBF_H 1

#define PHP_OBF_VERSION "1.0"
#define PHP_OBF_EXTNAME "obf"
#define MAX_PASSWORD_LEN 50

#include "global.h"
#include "md5.h"

PHP_FUNCTION(obf_password);
PHP_FUNCTION(encode_attributes);

extern zend_module_entry obf_module_entry;
#define phpext_obf_ptr &obf_module_entry
#endif

