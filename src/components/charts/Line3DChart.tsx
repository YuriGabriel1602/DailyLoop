import * as echarts from "echarts";
import "echarts-gl";
import ReactECharts from "echarts-for-react";
import { buildLine3DOption, type FinanceHistoryPoint } from "@/lib/line3d";

export function Line3DChart({ history, height = 280 }: { history: FinanceHistoryPoint[]; height?: number }) {
  const option = buildLine3DOption(history);
  return <ReactECharts echarts={echarts} option={option} style={{ height, width: "100%" }} notMerge />;
}
