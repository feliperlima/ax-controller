package com.felipelima.axios16controller

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

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

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    requestNetworkPermissionsIfNeeded()
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
