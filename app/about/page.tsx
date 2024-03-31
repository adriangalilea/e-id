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
