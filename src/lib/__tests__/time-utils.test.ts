import { describe, it, expect } from "vitest";
import {
  formatTime,
  formatDuration,
  formatPrice,
  addMinutesToTime,
} from "../time-utils";

describe("formatTime", () => {
  it("formats morning time", () => {
    expect(formatTime("09:30")).toBe("9:30 AM");
  });

  it("formats afternoon time", () => {
    expect(formatTime("15:00")).toBe("3:00 PM");
  });

  it("formats midnight as 12:00 AM", () => {
    expect(formatTime("00:00")).toBe("12:00 AM");
  });

  it("formats noon as 12:00 PM", () => {
    expect(formatTime("12:00")).toBe("12:00 PM");
  });
});

describe("formatDuration", () => {
  it("formats minutes only", () => {
    expect(formatDuration(30)).toBe("30 min");
  });

  it("formats exactly one hour", () => {
    expect(formatDuration(60)).toBe("1 hr");
  });

  it("formats multiple hours", () => {
    expect(formatDuration(120)).toBe("2 hrs");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(90)).toBe("1 hr 30 min");
  });
});

describe("formatPrice", () => {
  it("formats cents to dollars", () => {
    expect(formatPrice(5000)).toBe("$50.00");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("formats cents with decimals", () => {
    expect(formatPrice(1299)).toBe("$12.99");
  });
});

describe("addMinutesToTime", () => {
  it("adds minutes within same hour", () => {
    expect(addMinutesToTime("09:00", 30)).toBe("09:30");
  });

  it("adds minutes crossing hour boundary", () => {
    expect(addMinutesToTime("09:45", 30)).toBe("10:15");
  });

  it("adds a full hour", () => {
    expect(addMinutesToTime("14:00", 60)).toBe("15:00");
  });
});
