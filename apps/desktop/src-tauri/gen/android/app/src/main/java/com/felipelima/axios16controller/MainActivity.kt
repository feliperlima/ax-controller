package com.felipelima.axios16controller

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {

  private val networkPermissions = buildList {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      add(Manifest.permission.NEARBY_WIFI_DEVICES)
    }
    add(Manifest.permission.CHANGE_WIFI_MULTICAST_STATE)
    add(Manifest.permission.ACCESS_WIFI_STATE)
    add(Manifest.permission.CHANGE_WIFI_STATE)
    add(Manifest.permission.ACCESS_NETWORK_STATE)
  }.toTypedArray()

  private val requestPermissionsLauncher =
    registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { _ -> }

  private var lastInsetsJs: String? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    setupSafeAreaInsets()
    requestNetworkPermissionsIfNeeded()
  }

  // Edge-to-edge faz o WebView desenhar sob as barras do sistema, mas o WebView Android
  // NÃO expõe env(safe-area-inset-*) ao CSS (retorna 0). Lemos os WindowInsets reais e
  // injetamos como CSS vars (--safe-*) no documento — o CSS usa var(--safe-*).
  private fun setupSafeAreaInsets() {
    val content = findViewById<View>(android.R.id.content) ?: return
    ViewCompat.setOnApplyWindowInsetsListener(content) { _, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      val d = resources.displayMetrics.density
      lastInsetsJs =
        "var r=document.documentElement.style;" +
        "r.setProperty('--safe-top','${bars.top / d}px');" +
        "r.setProperty('--safe-right','${bars.right / d}px');" +
        "r.setProperty('--safe-bottom','${bars.bottom / d}px');" +
        "r.setProperty('--safe-left','${bars.left / d}px');"
      injectInsets(content, 0)
      insets
    }
  }

  // O WebView pode não ter DOM pronto no 1º inset event — reaplica algumas vezes.
  private fun injectInsets(content: View, attempt: Int) {
    val js = lastInsetsJs ?: return
    findWebView(content)?.evaluateJavascript(js, null)
    if (attempt < 6) {
      Handler(Looper.getMainLooper()).postDelayed({ injectInsets(content, attempt + 1) }, 400)
    }
  }

  private fun findWebView(view: View): WebView? {
    if (view is WebView) return view
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        findWebView(view.getChildAt(i))?.let { return it }
      }
    }
    return null
  }

  private fun requestNetworkPermissionsIfNeeded() {
    val missing = networkPermissions.filter {
      ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
    }
    if (missing.isNotEmpty()) {
      requestPermissionsLauncher.launch(missing.toTypedArray())
    }
  }
}
