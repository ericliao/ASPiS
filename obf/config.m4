PHP_ARG_ENABLE(obf, whether to enable iRODS password obfuscation support,
[ --enable-obf   Enable iRODS password obfuscation support])

if test "$PHP_OBF" = "yes"; then
    AC_DEFINE(HAVE_OBF, 1, [Whether you have iRODS password obfuscation support])
    PHP_NEW_EXTENSION(obf, obf.c md5c.c, $ext_shared)
fi

