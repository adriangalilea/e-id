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
    <div className="w-full h-full flex justify-center items-start">
      <Card className="lg:prose lg:prose-sm lg:prose-zinc lg:dark:prose-invert bg-zinc-50/90 sm:dark:bg-zinc-950/60 dark:bg-zinc-800 backdrop-blur-2xl transition-all ease-in-out duration-500 w-full">
        <CardHeader>
          <CardTitle>
            <h1>Frequently Asked Questions</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <h2>What is e-ID?</h2>
              </AccordionTrigger>
              <AccordionContent>
                <p className="prose prose-zinc dark:prose-invert w-full">
                  e-ID is a digital business card that allows you to share all
                  your social links and contact information in one place.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
