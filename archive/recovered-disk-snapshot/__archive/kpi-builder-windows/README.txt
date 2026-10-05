KPI Builder — Windows (CommonJS .cjs) v2
===========================================

This version explicitly requests the `person__id` field from GovTrack, so
the builder can always key people correctly.

How to use
----------
1) Place this folder inside your project so `cards.html` is one level above it, e.g.
   C:\fantasy-politics\cards.html
   C:\fantasy-politics\kpi-builder-windows-cjs-v2\build-kpis.cmd

2) Double-click build-kpis.cmd
3) Wait for "Wrote N unique people ..." then reload http://localhost:5500/cards.html
