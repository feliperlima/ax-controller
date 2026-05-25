# THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!!

# Copyright 2020-2023 Tauri Programme within The Commons Conservancy
# SPDX-License-Identifier: Apache-2.0
# SPDX-License-Identifier: MIT

-keep class com.felipelima.axios16controller.* {
  native <methods>;
}

-keep class com.felipelima.axios16controller.WryActivity {
  public <init>(...);

  void setWebView(com.felipelima.axios16controller.RustWebView);
  java.lang.Class getAppClass(...);
  int getId();
  java.lang.String getVersion();
  int startActivity(...);
}

-keep class com.felipelima.axios16controller.Ipc {
  public <init>(...);

  @android.webkit.JavascriptInterface public <methods>;
}

-keep class com.felipelima.axios16controller.RustWebView {
  public <init>(...);

  void loadUrlMainThread(...);
  void loadHTMLMainThread(...);
  void evalScript(...);
}

-keep class com.felipelima.axios16controller.RustWebChromeClient,com.felipelima.axios16controller.RustWebViewClient {
  public <init>(...);
}
