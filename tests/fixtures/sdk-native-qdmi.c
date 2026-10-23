#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <qdmi/client.h>

/* Lifecycle symbols belong to the official example driver, not the QDMI ABI. */
extern int QDMI_driver_init(void);
extern int QDMI_driver_shutdown(void);

int main(void) {
  assert(QDMI_driver_init() == 0);
  QDMI_Session session = NULL;
  assert(QDMI_session_alloc(&session) == 0 && session != NULL);
  const char token[] = "";
  assert(QDMI_session_set_parameter(session, QDMI_SESSION_PARAMETER_TOKEN, sizeof(token), token) == 0);
  assert(QDMI_session_init(session) == 0);
  size_t size = 0;
  assert(QDMI_session_query_session_property(session, QDMI_SESSION_PROPERTY_DEVICES, 0, NULL, &size) == 0);
  assert(size > 0 && size % sizeof(QDMI_Device) == 0);
  QDMI_Device *devices = malloc(size);
  assert(devices != NULL);
  assert(QDMI_session_query_session_property(session, QDMI_SESSION_PROPERTY_DEVICES, size, devices, NULL) == 0);
  FILE *output = fopen("device-metadata.txt", "w");
  assert(output != NULL);
  for (size_t i = 0; i < size / sizeof(QDMI_Device); ++i) {
    size_t required = 0;
    assert(QDMI_device_query_device_property(devices[i], QDMI_DEVICE_PROPERTY_NAME, 0, NULL, &required) == 0);
    assert(required > 0);
    char *name = malloc(required);
    assert(name != NULL);
    assert(QDMI_device_query_device_property(devices[i], QDMI_DEVICE_PROPERTY_NAME, required, name, NULL) == 0);
    assert(name[required - 1] == '\0');
    fprintf(output, "%s\n", name);
    free(name);
    assert(QDMI_device_query_device_property(devices[i], (QDMI_Device_Property)-1, 0, NULL, NULL) != 0);
  }
  fclose(output);
  printf("{\"devices\":%zu,\"driver\":\"official local example\",\"scientificValidation\":\"not_evaluated\"}\n", size / sizeof(QDMI_Device));
  free(devices);
  QDMI_session_free(session);
  assert(QDMI_driver_shutdown() == 0);
  return 0;
}
