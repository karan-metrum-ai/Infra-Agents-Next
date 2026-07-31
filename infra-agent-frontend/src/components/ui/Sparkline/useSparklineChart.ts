"use client";

import { useEffect, type RefObject } from "react";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import { debounce } from "@/utils/debounce";

/**
 * Owns the ECharts instance lifecycle for `Sparkline`, per `005-echarts.mdc`
 * and the sans-effect convention (Pattern 4 — genuine external-library DOM
 * sync gets its own named hook, not a bare `useEffect` in the component).
 *
 * Fixes a real Phase 15 perf bug: the previous inline effect keyed its
 * init/dispose cycle on `seriesPairs.length`, so the whole ECharts instance
 * was torn down and rebuilt on *every* incremental data point (a live
 * metric streaming in new samples updates length constantly) -- exactly
 * the "dispose+recreate on data update" anti-pattern `005-echarts.mdc`
 * bans. The chart container only actually mounts/unmounts once, when
 * `Sparkline` swaps between its placeholder (<2 points) and real chart
 * (>=2 points) — so this hook keys init/dispose on that one boolean
 * (`hasEnoughData`) instead, and lets the second effect's targeted
 * `setOption` handle every subsequent data/style change without ever
 * touching `init`/`dispose` again.
 */
export function useSparklineChart(
  containerRef: RefObject<HTMLDivElement | null>,
  chartRef: RefObject<echarts.ECharts | null>,
  hasEnoughData: boolean,
  option: EChartsOption | null,
): void {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !hasEnoughData) {
      return undefined;
    }

    chartRef.current = echarts.init(el, undefined, { renderer: "canvas" });

    const handleResize = debounce(() => chartRef.current?.resize(), 200);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(handleResize);
      observer.observe(el);
    }

    return () => {
      observer?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: init/dispose keys only on the placeholder<->chart mount boundary, not on containerRef/chartRef identity (stable) or option (handled by the effect below).
  }, [hasEnoughData]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !option) {
      return;
    }
    chart.setOption(option, { notMerge: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: chartRef is stable; re-runs exactly when `option` (memoized by the caller from its real inputs) changes.
  }, [option]);
}
