import * as React from "react";
import samples from "../taskpane/samples.json";
import scanCache from "./scan-cache.json";
import type { Field, ScanRequest, ScanResult } from "../taskpane/types";
import { senderLine } from "../taskpane/types";
import { scanEmail } from "../taskpane/lib/api";
import { Highlighted } from "../taskpane/components/EmailView";
import { marksFor } from "../taskpane/lib/segments";
import { VerdictBanner } from "../taskpane/components/VerdictBanner";
import { FlagList } from "../taskpane/components/FlagList";
import { useSweep } from "../taskpane/components/useSweep";

interface Sample { id: string; label: "legit" | "scam"; display: string; claimed_company: string; request: ScanRequest }

// Real careers pages for the companies emails claim to be from - so "cross-check" opens the
// actual employer's job listings, not a fake/local one. Omitted entirely for fictional demo
// companies (no real page exists) or where no dedicated careers page could be confirmed
// (falls back to the company's real homepage instead of guessing a URL that might 404).
const CAREERS_URL: Record<string, string> = {
  Tesla: "https://www.tesla.com/careers",
  Amazon: "https://www.amazon.jobs/",
  Google: "https://careers.google.com/",
  Microsoft: "https://careers.microsoft.com/",
  Meta: "https://www.metacareers.com/",
  Apple: "https://www.apple.com/careers/us/",
  Netflix: "https://jobs.netflix.com/",
  "JPMorgan Chase": "https://careers.jpmorgan.com/",
  "Goldman Sachs": "https://www.goldmansachs.com/careers/",
  Deloitte: "https://www2.deloitte.com/us/en/careers.html",
  Stripe: "https://stripe.com/jobs",
  Solari: "https://www.getsolari.com/",
  "Block Convey": "https://blockconvey.com/",
  Visionbrew: "https://www.visionbrew.app/",
  "Integral Recruiting": "https://integralrecruiting.com/",
  "localhost:nyc": "https://localhost-nyc.com/",
  NYU: "https://www.nyu.edu/about/careers-at-nyu.html",
};

const CACHE = scanCache as Record<string, ScanResult>;
const CACHED_SWEEP_DELAY_MS = 650; // keeps the "waiting" beat feeling intentional even from cache

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const SAMPLES = samples as Sample[];

// Sponsor/event-themed emails float to the top of the inbox for the demo.
const FEATURED_ORDER = [
  "legit-007", "scam-011", "legit-008", "scam-012", "legit-009", "scam-013",
  "legit-010", "scam-014", "legit-011", "scam-015", "legit-012", "scam-016",
  "legit-013", "scam-017",
];
const featuredIdx = new Map(FEATURED_ORDER.map((id, i) => [id, i]));
const ORDERED_SAMPLES = [...SAMPLES].sort((a, b) => {
  const fa = featuredIdx.get(a.id), fb = featuredIdx.get(b.id);
  if (fa !== undefined && fb !== undefined) return fa - fb;
  if (fa !== undefined) return -1;
  if (fb !== undefined) return 1;
  return 0;
});

type Phase = "idle" | "waiting" | "sweeping" | "done" | "error";

// Real Microsoft Fluent UI System Icons (MIT licensed), fetched from
// github.com/microsoft/fluentui-system-icons, fill recolored to currentColor.
function fluentIcon(d: string) {
  return function IconSvg(props: { size?: number }) {
    return (
      <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none">
        <path d={d} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
      </svg>
    );
  };
}
const Icon = {
  Search: fluentIcon("M16.1017 17.1624C14.717 18.3101 12.9391 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11C19 12.9391 18.3101 14.717 17.1624 16.1018L21.7803 20.7197C22.0732 21.0126 22.0732 21.4874 21.7803 21.7803C21.4874 22.0732 21.0125 22.0732 20.7196 21.7803L16.1017 17.1624ZM17.5 11C17.5 7.41015 14.5899 4.5 11 4.5C7.41015 4.5 4.5 7.41015 4.5 11C4.5 14.5899 7.41015 17.5 11 17.5C14.5899 17.5 17.5 14.5899 17.5 11Z"),
  Bell: fluentIcon("M12.0001 1.99609C16.05 1.99609 19.3568 5.19084 19.4959 9.24515L19.5001 9.49609V13.5931L20.8801 16.7491C20.9492 16.907 20.9848 17.0775 20.9848 17.2499C20.9848 17.9402 20.4252 18.4999 19.7348 18.4999L15.0001 18.5014C15.0001 20.1582 13.657 21.5014 12.0001 21.5014C10.4024 21.5014 9.09645 20.2524 9.0052 18.6776L8.99966 18.4991L4.27498 18.4999C4.10364 18.4999 3.93413 18.4646 3.77697 18.3964C3.14377 18.1213 2.85342 17.3851 3.12846 16.7519L4.50011 13.594V9.49599C4.50071 5.3412 7.8522 1.99609 12.0001 1.99609ZM13.4997 18.4991L10.5001 18.5014C10.5001 19.3298 11.1717 20.0014 12.0001 20.0014C12.7798 20.0014 13.4206 19.4065 13.4932 18.6458L13.4997 18.4991ZM12.0001 3.49609C8.67995 3.49609 6.00059 6.17035 6.00011 9.49609V13.9057L4.65613 16.9999H19.3526L18.0001 13.9067L18.0002 9.50895L17.9965 9.28375C17.8854 6.05027 15.2417 3.49609 12.0001 3.49609Z"),
  Gear: fluentIcon("M12.0122 2.25C12.7462 2.25846 13.4773 2.34326 14.1937 2.50304C14.5064 2.57279 14.7403 2.83351 14.7758 3.15196L14.946 4.67881C15.0231 5.37986 15.615 5.91084 16.3206 5.91158C16.5103 5.91188 16.6979 5.87238 16.8732 5.79483L18.2738 5.17956C18.5651 5.05159 18.9055 5.12136 19.1229 5.35362C20.1351 6.43464 20.8889 7.73115 21.3277 9.14558C21.4223 9.45058 21.3134 9.78203 21.0564 9.9715L19.8149 10.8866C19.4607 11.1468 19.2516 11.56 19.2516 11.9995C19.2516 12.4389 19.4607 12.8521 19.8157 13.1129L21.0582 14.0283C21.3153 14.2177 21.4243 14.5492 21.3297 14.8543C20.8911 16.2685 20.1377 17.5649 19.1261 18.6461C18.9089 18.8783 18.5688 18.9483 18.2775 18.8206L16.8712 18.2045C16.4688 18.0284 16.0068 18.0542 15.6265 18.274C15.2463 18.4937 14.9933 18.8812 14.945 19.3177L14.7759 20.8444C14.741 21.1592 14.5122 21.4182 14.204 21.4915C12.7556 21.8361 11.2465 21.8361 9.79803 21.4915C9.48991 21.4182 9.26105 21.1592 9.22618 20.8444L9.05736 19.32C9.00777 18.8843 8.75434 18.498 8.37442 18.279C7.99451 18.06 7.5332 18.0343 7.1322 18.2094L5.72557 18.8256C5.43422 18.9533 5.09403 18.8833 4.87678 18.6509C3.86462 17.5685 3.11119 16.2705 2.6732 14.8548C2.57886 14.5499 2.68786 14.2186 2.94485 14.0293L4.18818 13.1133C4.54232 12.8531 4.75147 12.4399 4.75147 12.0005C4.75147 11.561 4.54232 11.1478 4.18771 10.8873L2.94516 9.97285C2.6878 9.78345 2.5787 9.45178 2.67337 9.14658C3.11212 7.73215 3.86594 6.43564 4.87813 5.35462C5.09559 5.12236 5.43594 5.05259 5.72724 5.18056L7.12762 5.79572C7.53056 5.97256 7.9938 5.94585 8.37577 5.72269C8.75609 5.50209 9.00929 5.11422 9.05817 4.67764L9.22824 3.15196C9.26376 2.83335 9.49786 2.57254 9.8108 2.50294C10.5281 2.34342 11.26 2.25865 12.0122 2.25ZM12.0124 3.7499C11.5583 3.75524 11.1056 3.79443 10.6578 3.86702L10.5489 4.84418C10.4471 5.75368 9.92003 6.56102 9.13042 7.01903C8.33597 7.48317 7.36736 7.53903 6.52458 7.16917L5.62629 6.77456C5.05436 7.46873 4.59914 8.25135 4.27852 9.09168L5.07632 9.67879C5.81513 10.2216 6.25147 11.0837 6.25147 12.0005C6.25147 12.9172 5.81513 13.7793 5.0771 14.3215L4.27805 14.9102C4.59839 15.752 5.05368 16.5361 5.626 17.2316L6.53113 16.8351C7.36923 16.4692 8.33124 16.5227 9.12353 16.9794C9.91581 17.4361 10.4443 18.2417 10.548 19.1526L10.657 20.1365C11.5466 20.2878 12.4555 20.2878 13.3451 20.1365L13.4541 19.1527C13.5549 18.2421 14.0828 17.4337 14.876 16.9753C15.6692 16.5168 16.6332 16.463 17.4728 16.8305L18.3772 17.2267C18.949 16.5323 19.4041 15.7495 19.7247 14.909L18.9267 14.3211C18.1879 13.7783 17.7516 12.9162 17.7516 11.9995C17.7516 11.0827 18.1879 10.2206 18.9258 9.67847L19.7227 9.09109C19.4021 8.25061 18.9468 7.46784 18.3748 6.77356L17.4783 7.16737C17.113 7.32901 16.7178 7.4122 16.3187 7.41158C14.849 7.41004 13.6155 6.30355 13.4551 4.84383L13.3462 3.8667C12.9007 3.7942 12.4526 3.75512 12.0124 3.7499ZM11.9997 8.24995C14.0708 8.24995 15.7497 9.92888 15.7497 12C15.7497 14.071 14.0708 15.75 11.9997 15.75C9.92863 15.75 8.2497 14.071 8.2497 12C8.2497 9.92888 9.92863 8.24995 11.9997 8.24995ZM11.9997 9.74995C10.7571 9.74995 9.7497 10.7573 9.7497 12C9.7497 13.2426 10.7571 14.25 11.9997 14.25C13.2423 14.25 14.2497 13.2426 14.2497 12C14.2497 10.7573 13.2423 9.74995 11.9997 9.74995Z"),
  NewMail: fluentIcon("M5.25 4H18.75C20.483 4 21.8992 5.35645 21.9949 7.06558L22 7.25V16.75C22 18.483 20.6435 19.8992 18.9344 19.9949L18.75 20H5.25C3.51697 20 2.10075 18.6435 2.00514 16.9344L2 16.75V7.25C2 5.51697 3.35645 4.10075 5.06558 4.00514L5.25 4H18.75H5.25ZM20.5 9.373L12.3493 13.6637C12.1619 13.7623 11.9431 13.7764 11.7468 13.706L11.6507 13.6637L3.5 9.374V16.75C3.5 17.6682 4.20711 18.4212 5.10647 18.4942L5.25 18.5H18.75C19.6682 18.5 20.4212 17.7929 20.4942 16.8935L20.5 16.75V9.373ZM18.75 5.5H5.25C4.33183 5.5 3.57881 6.20711 3.5058 7.10647L3.5 7.25V7.679L12 12.1525L20.5 7.678V7.25C20.5 6.33183 19.7929 5.57881 18.8935 5.5058L18.75 5.5Z"),
  Trash: fluentIcon("M10 5H14C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5ZM8.5 5C8.5 3.067 10.067 1.5 12 1.5C13.933 1.5 15.5 3.067 15.5 5H21.25C21.6642 5 22 5.33579 22 5.75C22 6.16421 21.6642 6.5 21.25 6.5H19.9309L18.7589 18.6112C18.5729 20.5334 16.9575 22 15.0263 22H8.97369C7.04254 22 5.42715 20.5334 5.24113 18.6112L4.06908 6.5H2.75C2.33579 6.5 2 6.16421 2 5.75C2 5.33579 2.33579 5 2.75 5H8.5ZM10.5 9.75C10.5 9.33579 10.1642 9 9.75 9C9.33579 9 9 9.33579 9 9.75V17.25C9 17.6642 9.33579 18 9.75 18C10.1642 18 10.5 17.6642 10.5 17.25V9.75ZM14.25 9C14.6642 9 15 9.33579 15 9.75V17.25C15 17.6642 14.6642 18 14.25 18C13.8358 18 13.5 17.6642 13.5 17.25V9.75C13.5 9.33579 13.8358 9 14.25 9ZM6.73416 18.4667C6.84577 19.62 7.815 20.5 8.97369 20.5H15.0263C16.185 20.5 17.1542 19.62 17.2658 18.4667L18.4239 6.5H5.57608L6.73416 18.4667Z"),
  Archive: fluentIcon("M10.25 11C9.83579 11 9.5 11.3358 9.5 11.75C9.5 12.1642 9.83579 12.5 10.25 12.5H13.75C14.1642 12.5 14.5 12.1642 14.5 11.75C14.5 11.3358 14.1642 11 13.75 11H10.25ZM3 5.25C3 4.00736 4.00736 3 5.25 3H18.75C19.9926 3 21 4.00736 21 5.25V6.75C21 7.5301 20.603 8.21748 20 8.62111V17.25C20 19.3211 18.3211 21 16.25 21H7.75C5.67893 21 4 19.3211 4 17.25V8.62111C3.39701 8.21748 3 7.5301 3 6.75V5.25ZM5.5 9V17.25C5.5 18.4926 6.50736 19.5 7.75 19.5H16.25C17.4926 19.5 18.5 18.4926 18.5 17.25V9H5.5ZM5.25 4.5C4.83579 4.5 4.5 4.83579 4.5 5.25V6.75C4.5 7.16421 4.83579 7.5 5.25 7.5H18.75C19.1642 7.5 19.5 7.16421 19.5 6.75V5.25C19.5 4.83579 19.1642 4.5 18.75 4.5H5.25Z"),
  ReplyAll: fluentIcon("M9.28033 5.21967C9.57322 5.51256 9.57322 5.98744 9.28033 6.28033L4.81066 10.75L9.28033 15.2197C9.57322 15.5126 9.57322 15.9874 9.28033 16.2803C8.98744 16.5732 8.51256 16.5732 8.21967 16.2803L3.21967 11.2803C2.92678 10.9874 2.92678 10.5126 3.21967 10.2197L8.21967 5.21967C8.51256 4.92678 8.98744 4.92678 9.28033 5.21967ZM13.2803 5.21967C13.5732 5.51256 13.5732 5.98744 13.2803 6.28033L9.56066 10H13.25C17.5302 10 21 13.4698 21 17.75V18.25C21 18.6642 20.6642 19 20.25 19C19.8358 19 19.5 18.6642 19.5 18.25V17.75C19.5 14.2982 16.7018 11.5 13.25 11.5H9.56066L13.2803 15.2197C13.5732 15.5126 13.5732 15.9874 13.2803 16.2803C12.9874 16.5732 12.5126 16.5732 12.2197 16.2803L7.21967 11.2803C6.92678 10.9874 6.92678 10.5126 7.21967 10.2197L12.2197 5.21967C12.5126 4.92678 12.9874 4.92678 13.2803 5.21967Z"),
  Inbox: fluentIcon("M6.25 3H17.75C19.483 3 20.8992 4.35645 20.9949 6.06558L21 6.25V17.75C21 19.483 19.6435 20.8992 17.9344 20.9949L17.75 21H6.25C4.51697 21 3.10075 19.6435 3.00514 17.9344L3 17.75V6.25C3 4.51697 4.35645 3.10075 6.06558 3.00514L6.25 3ZM8.32501 14.5H4.5V17.75C4.5 18.6682 5.20711 19.4212 6.10647 19.4942L6.25 19.5H17.75C18.6682 19.5 19.4212 18.7929 19.4942 17.8935L19.5 17.75V14.5H15.675C15.3404 16.1483 13.9247 17.404 12.2003 17.4947L12 17.5C10.253 17.5 8.78498 16.3053 8.36837 14.6884L8.32501 14.5ZM17.75 4.5H6.25C5.33183 4.5 4.57881 5.20711 4.5058 6.10647L4.5 6.25V13H9C9.3797 13 9.69349 13.2822 9.74315 13.6482L9.75 13.75C9.75 14.9926 10.7574 16 12 16C13.1909 16 14.1656 15.0748 14.2448 13.904L14.25 13.75C14.25 13.3703 14.5322 13.0565 14.8982 13.0068L15 13H19.5V6.25C19.5 5.33183 18.7929 4.57881 17.8935 4.5058L17.75 4.5ZM6.75 9.5H17.25C17.6642 9.5 18 9.83579 18 10.25C18 10.6297 17.7178 10.9435 17.3518 10.9932L17.25 11H6.75C6.33579 11 6 10.6642 6 10.25C6 9.8703 6.28215 9.55651 6.64823 9.50685L6.75 9.5H17.25H6.75ZM6.75 6.5H17.25C17.6642 6.5 18 6.83579 18 7.25C18 7.6297 17.7178 7.94349 17.3518 7.99315L17.25 8H6.75C6.33579 8 6 7.66421 6 7.25C6 6.8703 6.28215 6.55651 6.64823 6.50685L6.75 6.5H17.25H6.75Z"),
  Drafts: fluentIcon("M20.9519 3.0481C19.5543 1.65058 17.2885 1.65064 15.8911 3.04825L3.94103 14.9997C3.5347 15.4061 3.2491 15.9172 3.116 16.4762L2.02041 21.0777C1.96009 21.3311 2.03552 21.5976 2.21968 21.7817C2.40385 21.9659 2.67037 22.0413 2.92373 21.981L7.52498 20.8855C8.08418 20.7523 8.59546 20.4666 9.00191 20.0601L20.952 8.10861C22.3493 6.71112 22.3493 4.4455 20.9519 3.0481ZM16.9518 4.10884C17.7634 3.29709 19.0795 3.29705 19.8912 4.10876C20.7028 4.9204 20.7029 6.23632 19.8913 7.04801L19 7.93946L16.0606 5.00012L16.9518 4.10884ZM15 6.06084L17.9394 9.00018L7.94119 18.9995C7.73104 19.2097 7.46668 19.3574 7.17755 19.4263L3.76191 20.2395L4.57521 16.8237C4.64402 16.5346 4.79168 16.2704 5.00175 16.0603L15 6.06084Z"),
  Sent: fluentIcon("M5.69362 11.9997L2.29933 3.2715C2.0631 2.66403 2.65544 2.08309 3.2414 2.28959L3.33375 2.32885L21.3337 11.3288C21.852 11.588 21.8844 12.2975 21.4309 12.6129L21.3337 12.6705L3.33375 21.6705C2.75077 21.962 2.11746 21.426 2.2688 20.8234L2.29933 20.7278L5.69362 11.9997L2.29933 3.2715L5.69362 11.9997ZM4.4021 4.54007L7.01109 11.2491L13.6387 11.2497C14.0184 11.2497 14.3322 11.5318 14.3818 11.8979L14.3887 11.9997C14.3887 12.3794 14.1065 12.6932 13.7404 12.7428L13.6387 12.7497L7.01109 12.7491L4.4021 19.4593L19.3213 11.9997L4.4021 4.54007Z"),
  Junk: fluentIcon("M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM18.5173 6.54309L6.54309 18.5173C8.01955 19.7549 9.92276 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 9.92276 19.7549 8.01955 18.5173 6.54309ZM12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.0772 4.24513 15.9804 5.48268 17.4569L17.4569 5.48268C15.9804 4.24513 14.0772 3.5 12 3.5Z"),
  Chat: fluentIcon("M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C10.3817 22 8.81782 21.6146 7.41286 20.888L3.58704 21.9553C2.92212 22.141 2.23258 21.7525 2.04691 21.0876C1.98546 20.8676 1.98549 20.6349 2.04695 20.4151L3.11461 16.5922C2.38637 15.186 2 13.6203 2 12C2 6.47715 6.47715 2 12 2ZM12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 13.4696 3.87277 14.8834 4.57303 16.1375L4.72368 16.4072L3.61096 20.3914L7.59755 19.2792L7.86709 19.4295C9.12006 20.1281 10.5322 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM8.75 13H13.2483C13.6625 13 13.9983 13.3358 13.9983 13.75C13.9983 14.1297 13.7161 14.4435 13.35 14.4932L13.2483 14.5H8.75C8.33579 14.5 8 14.1642 8 13.75C8 13.3703 8.28215 13.0565 8.64823 13.0068L8.75 13H13.2483H8.75ZM8.75 9.5H15.2545C15.6687 9.5 16.0045 9.83579 16.0045 10.25C16.0045 10.6297 15.7223 10.9435 15.3563 10.9932L15.2545 11H8.75C8.33579 11 8 10.6642 8 10.25C8 9.8703 8.28215 9.55651 8.64823 9.50685L8.75 9.5H15.2545H8.75Z"),
  Note: fluentIcon("M17.75 3C19.5449 3 21 4.45507 21 6.25V13.1287C21 13.7254 20.7629 14.2977 20.341 14.7197L14.7197 20.341C14.2977 20.7629 13.7254 21 13.1287 21H6.25C4.45507 21 3 19.5449 3 17.75V6.25C3 4.45507 4.45507 3 6.25 3H17.75ZM17.75 4.5H6.25C5.2835 4.5 4.5 5.2835 4.5 6.25V17.75C4.5 18.7165 5.2835 19.5 6.25 19.5H13V16.25C13 14.517 14.3565 13.1008 16.0656 13.0051L16.25 13H19.5V6.25C19.5 5.2835 18.7165 4.5 17.75 4.5ZM18.439 14.5H16.25C15.3318 14.5 14.5788 15.2071 14.5058 16.1065L14.5 16.25V18.439L18.439 14.5Z"),
};

const AVATAR_COLORS = ["#5b2d8e", "#8764b8", "#c239b3", "#e3008c", "#ca5010", "#8e8cd8", "#0078d4", "#038387", "#498205", "#986f0b"];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
// Deterministic timestamps so the inbox reads naturally, newest first, staggered ~23min apart.
const NOW = new Date("2026-09-19T18:58:00");
function timeFor(i: number): Date {
  return new Date(NOW.getTime() - i * 23 * 60_000);
}
function relativeTime(i: number): string {
  const d = timeFor(i);
  const hoursAgo = (NOW.getTime() - d.getTime()) / 3_600_000;
  if (hoursAgo < 20) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const daysAgo = Math.floor(hoursAgo / 24);
  return daysAgo <= 1 ? "Yesterday" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function App() {
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const lineRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const busy = phase === "waiting" || phase === "sweeping";
  const finishSweep = React.useCallback(() => setPhase("done"), []);
  useSweep(phase === "sweeping", contentRef, lineRef, scrollRef, finishSweep);

  const selected = ORDERED_SAMPLES[selectedIdx];
  const email = selected.request;
  const marks = (field: Field) => (result ? marksFor(result, field) : []);

  const selectEmail = (idx: number) => {
    if (busy || idx === selectedIdx) return;
    setSelectedIdx(idx);
    setPhase("idle");
    setResult(null);
    setError(null);
  };

  const scan = async () => {
    if (busy) return;
    setError(null);
    setResult(null);
    setPhase("waiting");
    try {
      const cached = CACHE[selected.id];
      let response: ScanResult;
      if (cached) {
        await sleep(CACHED_SWEEP_DELAY_MS);
        response = cached;
      } else {
        response = await scanEmail(email);
      }
      setResult(response);
      setPhase("sweeping");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not scan this email. Please retry.");
      setPhase("error");
    }
  };

  return (
    <div className="outlook-shell">
      <header className="outlook-topbar">
        <span className="outlook-waffle" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></span>
        <div className="outlook-brand">Outlook</div>
        <div className="outlook-search" aria-hidden="true"><Icon.Search /> Search</div>
        <div className="outlook-topbar-right">
          <span className="upsell">Buy Microsoft 365</span>
          <span aria-hidden="true"><Icon.Bell /></span>
          <span aria-hidden="true"><Icon.Gear /></span>
          <div className="outlook-account" aria-hidden="true">S</div>
        </div>
      </header>

      <div className="outlook-ribbon">
        <div className="outlook-ribbon-tabs">
          <span>File</span><span className="active">Home</span><span>View</span><span>Help</span>
        </div>
        <button type="button" className="outlook-newmail"><Icon.NewMail /> New mail</button>
        <span className="outlook-ribbon-action"><Icon.Trash /> Delete</span>
        <span className="outlook-ribbon-action"><Icon.Archive /> Archive</span>
        <span className="outlook-ribbon-action"><Icon.ReplyAll /> Reply all</span>
        <button className="outlook-ribbon-action scan" type="button" onClick={scan} disabled={busy}>
          {busy ? "Scanning…" : phase === "done" ? "Rescan for scams" : "Scan for scams"}
        </button>
      </div>

      <div className="outlook-body">
        <nav className="outlook-folders">
          <div className="outlook-folders-group">Favorites</div>
          <div className="outlook-folder active"><span className="outlook-folder-icon"><Icon.Inbox /></span><span className="outlook-folder-label">Inbox</span><span className="count">{ORDERED_SAMPLES.length}</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Drafts /></span><span className="outlook-folder-label">Drafts</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Archive /></span><span className="outlook-folder-label">Archive</span></div>
          <div className="outlook-folders-group">slhj1208@outlook....</div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Inbox /></span><span className="outlook-folder-label">Inbox</span><span className="count">{ORDERED_SAMPLES.length}</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Junk /></span><span className="outlook-folder-label">Junk Email</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Drafts /></span><span className="outlook-folder-label">Drafts</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Sent /></span><span className="outlook-folder-label">Sent Items</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Trash /></span><span className="outlook-folder-label">Deleted Items</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Archive /></span><span className="outlook-folder-label">Archive</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Chat /></span><span className="outlook-folder-label">Conversation Hist...</span></div>
          <div className="outlook-folder"><span className="outlook-folder-icon"><Icon.Note /></span><span className="outlook-folder-label">Notes</span></div>
        </nav>

        <div className="outlook-list-pane">
          <div className="outlook-list-tabs"><span className="active">Focused</span><span>Other</span></div>
          <div className="outlook-list" role="listbox" aria-label="Inbox">
            {ORDERED_SAMPLES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={i === selectedIdx}
                className={`outlook-row unread ${i === selectedIdx ? "selected" : ""}`}
                onClick={() => selectEmail(i)}
              >
                <span className="outlook-unread-dot" aria-hidden="true" />
                <span className="outlook-avatar" style={{ background: avatarColor(s.request.sender_name) }} aria-hidden="true">{initials(s.request.sender_name)}</span>
                <span className="outlook-row-main">
                  <span className="outlook-row-top">
                    <span className="outlook-sender">{s.request.sender_name}</span>
                    <span className="outlook-time">{relativeTime(i)}</span>
                  </span>
                  <span className="outlook-subject">{s.request.subject}</span>
                  <span className="outlook-snippet">{s.request.body.slice(0, 90).replace(/\n+/g, " ")}…</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <main className="outlook-reading">
          <div className="outlook-reading-header">
            <h1 className="outlook-reading-subject"><Highlighted text={email.subject} marks={marks("subject")} /></h1>
            <div className="outlook-reading-from">
              <span className="outlook-avatar" style={{ background: avatarColor(email.sender_name) }} aria-hidden="true">{initials(email.sender_name)}</span>
              <div className="outlook-reading-fromtext">
                <div className="outlook-reading-name"><Highlighted text={senderLine(email)} marks={marks("sender")} /></div>
                <div className="outlook-reading-to">To: Somya Gupta</div>
              </div>
              <div className="outlook-reading-date">
                {timeFor(selectedIdx).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric", year: "numeric" })}{" "}
                {timeFor(selectedIdx).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
          </div>

          {phase === "done" && result && <VerdictBanner result={result} />}
          {phase === "done" && result && CAREERS_URL[selected.claimed_company] && (
            <div className="crosscheck">
              <button
                type="button"
                className="crosscheck-btn"
                onClick={() => window.open(CAREERS_URL[selected.claimed_company], "_blank", "noopener,noreferrer")}
              >
                🔎 Check {selected.claimed_company}'s real careers page
              </button>
            </div>
          )}
          {error && <div className="error" role="alert">{error}</div>}

          <div className={`scroller phase-${phase}`} ref={scrollRef} aria-busy={busy}>
            <div className="email" ref={contentRef}>
              <div className="email-body"><Highlighted text={email.body} marks={marks("body")} /></div>
              <div ref={lineRef} className={`scanline ${phase === "waiting" ? "scanline-idle" : ""}`} aria-hidden="true" />
            </div>
          </div>

          {phase === "done" && result && <FlagList result={result} />}
        </main>
      </div>
    </div>
  );
}
