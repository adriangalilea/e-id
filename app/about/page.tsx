import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import Link from "next/link";

export default function Faq() {
  return (
    <div className="prose prose-zinc items-start justify-center dark:prose-invert">
      <h1 className="font-light">Frequently Asked Questions</h1>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-light">
            What is e-ID?
          </AccordionTrigger>
          <AccordionContent>
            e-ID is a digital business card that allows you to share all your
            social links and contact information in one place.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger className="font-light">
            Why is there an emoji on the URL?
          </AccordionTrigger>
          <AccordionContent>
            Emoji URL&apos;s standout and are underutilized.
            <img src="link_in_bio.webp" alt="Example from e-id.to/Lulx" />
            Twitter and instagram accept them as link in bio.
            <br />
            <br />
            This project works with 3 domains:
            <ul>
              <li>
                <Link href="https://e-id.to">e-id.to</Link>
              </li>
              <li>
                <Link href="https://eid.to">eid.to</Link>
              </li>
              <li>
                <Link href="https://👤.to">👤.to</Link>
              </li>
            </ul>
            They all work interchangeably.
            <br />
            <br />
            If you have issues setting your emoji domain try using the punnycode
            domain, like so:
            <br />
            <br />
            <Link href="https://xn--mq8h.to/adriangalilea">
              https://xn--mq8h.to/adriangalilea
            </Link>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger className="font-light">
            Where is the code?
          </AccordionTrigger>
          <AccordionContent>
            You can take a look at the code on{" "}
            <Link href={"https://github.com/adriangalilea/e-id"}>Github</Link>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
