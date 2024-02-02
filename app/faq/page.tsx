// create a faq page
// use card component
// use accordion component

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Faq() {
  return (
    <div className="w-full">
      <Card className="prose prose-zinc dark:prose-invert w-full">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is e-ID?</AccordionTrigger>
              <AccordionContent>
                e-ID is a digital business card that allows you to share all
                your social links and contact information in one place.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>How do I get an e-ID?</AccordionTrigger>
              <AccordionContent>
                Visit our homepage and fill-in the form to get your e-ID, no
                sign-up required.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Is e-ID safe and secure?</AccordionTrigger>
              <AccordionContent>
                Yes, e-ID is safe and secure. We literally don't store any of
                your data. All the data is encoded in the URL and is only
                accessible by the person who has the link.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
