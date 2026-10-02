add_executable(native-headless-baseline "${CMAKE_CURRENT_LIST_DIR}/baseline.cpp")
target_compile_features(native-headless-baseline PRIVATE cxx_std_20)
target_include_directories(native-headless-baseline PRIVATE "${CMAKE_SOURCE_DIR}/src")
target_link_libraries(native-headless-baseline PRIVATE libopenrct2)
