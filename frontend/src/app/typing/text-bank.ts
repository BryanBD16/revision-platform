import { shuffle } from '../shared/shuffle';

/** A paragraph of the typing tests, about 100 words, with only characters of a standard keyboard. */
export interface TypingText {
  topic: string;
  text: string;
}

export const TYPING_TEXTS: readonly TypingText[] = [
  {
    topic: 'SOLID principles',
    text:
      'SOLID is a set of five design principles for object-oriented code, popularized by Robert C. Martin. ' +
      'The letters stand for single responsibility, open-closed, Liskov substitution, interface segregation ' +
      'and dependency inversion. None of them is a strict rule. Together, they describe code that is easy ' +
      'to understand, to test and to change without breaking something else. They matter most in long-lived ' +
      'projects, where requirements keep moving and many developers touch the same files. Applied with ' +
      'judgment, they reduce coupling between classes. Applied blindly, they can produce many tiny ' +
      'abstractions that make a small program harder to read than it needs to be.',
  },
  {
    topic: 'SOLID principles',
    text:
      'The single responsibility principle says that a class should have only one reason to change. A class ' +
      'that formats a report and also saves it to a database will change when the layout changes and again ' +
      'when the storage changes, so those jobs belong in separate classes. The open-closed principle says ' +
      'that code should be open for extension but closed for modification. Instead of adding another case ' +
      'to a long switch statement each time a new type appears, the program can accept new implementations ' +
      'of an interface. Existing, tested code then stays untouched when the system grows with new features.',
  },
  {
    topic: 'SOLID principles',
    text:
      'The Liskov substitution principle states that a subclass must be usable wherever its parent class is ' +
      'expected, without surprising the caller. A square that inherits from a rectangle but breaks when its ' +
      'width is set alone is the classic counterexample. The interface segregation principle prefers several ' +
      'small interfaces over one large one, so that no class is forced to implement methods it does not need. ' +
      'Finally, dependency inversion asks high-level code to depend on abstractions rather than on concrete ' +
      'details. A service that receives a repository interface can be tested with a fake one, and its real ' +
      'database can later be replaced.',
  },
  {
    topic: 'Programming paradigms',
    text:
      'Object-oriented programming organizes a program around objects that combine data and the behavior ' +
      'that works on that data. A bank account object keeps its balance private and only exposes methods ' +
      'such as deposit and withdraw, which protect its rules. Classes describe the objects, inheritance lets ' +
      'a class reuse and specialize another, and polymorphism lets different objects answer the same message ' +
      'in their own way. This style maps well to business domains full of entities with state, which is why ' +
      'languages such as Java, C# and C++ made it the default way to build large applications for decades.',
  },
  {
    topic: 'Programming paradigms',
    text:
      'Functional programming builds programs from functions that behave like mathematical functions: the ' +
      'same input always gives the same output, and nothing outside the function is changed. Data is usually ' +
      'immutable, so instead of updating a list, a function returns a new one. Functions are values that can ' +
      'be passed to other functions, which makes tools such as map, filter and reduce possible. Because pure ' +
      'functions have no hidden state, they are easy to test and safe to run in parallel. Haskell and Elixir ' +
      'are built around this style, and most modern languages now borrow many of its ideas.',
  },
  {
    topic: 'Programming paradigms',
    text:
      'Structured programming came first. It replaced the jumps of early programs with three simple building ' +
      'blocks: sequences of statements, choices with if and else, and loops. Code is split into procedures, ' +
      'and data is often shared between them. C and Pascal are typical structured languages, and the style is ' +
      'still perfect for small tools and system code. In practice, the three paradigms are not rivals. A ' +
      'modern C# or TypeScript program uses structured control flow inside its methods, objects to model the ' +
      'domain, and functional techniques to transform collections. Good developers pick the style that makes ' +
      'each part clearest.',
  },
  {
    topic: 'Agile and Scrum',
    text:
      'The Agile Manifesto was written in 2001 by seventeen software developers who were tired of heavy, ' +
      'document-driven processes. It values individuals and interactions over processes and tools, working ' +
      'software over comprehensive documentation, customer collaboration over contract negotiation, and ' +
      'responding to change over following a plan. The items on the right still have value, but the items ' +
      'on the left matter more. Agile teams deliver small increments often, ask for feedback early, and adapt ' +
      'their plans as they learn. The goal is to reduce the risk of spending months building something that ' +
      'nobody actually needs.',
  },
  {
    topic: 'Agile and Scrum',
    text:
      'Scrum is the most popular agile framework. Work happens in sprints, fixed periods that usually last ' +
      'two weeks. The product owner maintains the product backlog, an ordered list of everything the product ' +
      'might need, and decides what brings the most value. The developers choose how to build it and commit ' +
      'to a sprint goal during sprint planning. The scrum master is not a manager: they coach the team, remove ' +
      'obstacles and protect the process. Every day, a short daily scrum of fifteen minutes lets the ' +
      'developers check their progress toward the goal and adjust their plan for the next day.',
  },
  {
    topic: 'Agile and Scrum',
    text:
      'At the end of each sprint, the team shows the increment to stakeholders in the sprint review and ' +
      'collects feedback that may reorder the backlog. Then, in the retrospective, the team looks at how it ' +
      'worked rather than what it built, and picks one or two concrete improvements to try. A user story ' +
      'often describes the work from the point of view of a user, with acceptance criteria that define when ' +
      'it is done. Scrum fails when its events become empty rituals, when sprints are filled beyond capacity, ' +
      'or when the team never acts on what its retrospectives reveal about real problems.',
  },
  {
    topic: 'Testing practices',
    text:
      'A unit test checks a small piece of code, such as a single function or class, in isolation from the ' +
      'database, the network and the file system. Good unit tests are fast, so developers can run hundreds of ' +
      'them in seconds after every change. Each test should verify one behavior and have a name that explains ' +
      'it, such as rejects an empty password. Many teams follow the arrange, act and assert pattern: prepare ' +
      'the data, call the code, then check the result. Tests should describe behavior rather than ' +
      'implementation details, otherwise every harmless refactoring breaks them and people stop trusting ' +
      'their results.',
  },
  {
    topic: 'Testing practices',
    text:
      'Test-driven development, or TDD, reverses the usual order of work. The developer first writes a small ' +
      'test that fails because the feature does not exist yet. Then they write just enough code to make the ' +
      'test pass, and finally they clean up the code while the tests stay green. This cycle is called red, ' +
      'green, refactor, and it usually lasts only a few minutes. TDD forces the developer to think about how ' +
      'the code will be used before writing it, and it leaves a complete safety net of tests behind. Its ' +
      'critics say it slows down exploratory work.',
  },
  {
    topic: 'Testing practices',
    text:
      'Integration tests check that several parts work together correctly, for example a web API with its ' +
      'real database. They are slower than unit tests but catch problems that mocks hide, such as a wrong ' +
      'query or a missing configuration. End-to-end tests go further and drive the whole application through ' +
      'its user interface, like a real user would. The test pyramid suggests writing many unit tests, fewer ' +
      'integration tests and only a handful of end-to-end tests, because the higher levels are slower and ' +
      'more fragile. Whatever the level, a test suite is only useful if it runs automatically on every change.',
  },
  {
    topic: 'Linux, Windows and macOS',
    text:
      'Linux is a free and open source kernel created by Linus Torvalds in 1991. Combined with tools from the ' +
      'GNU project and others, it forms distributions such as Ubuntu, Fedora and Debian. Linux runs most of ' +
      'the servers on the internet, nearly all supercomputers and, through Android, billions of phones. ' +
      'Developers like it for its powerful command line, its package managers and the freedom to inspect and ' +
      'change every part of the system. On the desktop, it is fast and private, but some commercial software ' +
      'and games are not available, and choosing between distributions can confuse new users.',
  },
  {
    topic: 'Linux, Windows and macOS',
    text:
      'Windows, made by Microsoft, is the most widely used desktop operating system in the world. Its main ' +
      'strength is compatibility: it supports a huge range of hardware, business applications and games, and ' +
      'most companies rely on it for their office computers. Recent versions include the Windows Subsystem ' +
      'for Linux, which lets developers run Linux tools directly inside Windows. Its weaknesses are frequent ' +
      'forced updates, preinstalled software and a long history of being the main target of malware, ' +
      'precisely because it is so common. Administrators manage large fleets of Windows machines with ' +
      'centralized tools.',
  },
  {
    topic: 'Linux, Windows and macOS',
    text:
      'macOS is the operating system of Apple computers. It is built on a Unix foundation, so its terminal ' +
      'offers many of the same commands as Linux, which makes it popular with developers. Apple designs both ' +
      'the hardware and the software, which gives a polished experience, long battery life and smooth ' +
      'integration with iPhones and iPads. The trade-off is price and choice: macOS only runs on Apple ' +
      'machines, which are expensive and hard to upgrade. In the end, the best system depends on the work. ' +
      'Many developers use all three, deploying to Linux servers from a Windows or Mac laptop.',
  },
  {
    topic: 'Computer hardware',
    text:
      'The central processing unit, or CPU, executes the instructions of every program. It repeats the same ' +
      'cycle billions of times per second: fetch an instruction from memory, decode it, execute it and store ' +
      'the result. The speed of this cycle is the clock frequency, measured in gigahertz. Modern processors ' +
      'contain several cores, each able to run its own stream of instructions, so many tasks can progress at ' +
      'the same time. They also predict which way the code will branch and execute instructions out of order, ' +
      'all to avoid waiting for data that is still on its way from memory.',
  },
  {
    topic: 'Computer hardware',
    text:
      'Computer memory is organized as a hierarchy. Registers inside the CPU are the fastest but can hold only ' +
      'a few values. Next come several levels of cache, small memories that keep recently used data close to ' +
      'the cores. Then comes the main memory, or RAM, which is much larger but loses its content when the power ' +
      'goes off. Finally, storage drives keep data permanently. A solid state drive, or SSD, uses flash chips ' +
      'and is far faster than an old hard disk with spinning platters. Each level down is bigger, cheaper and ' +
      'slower than the level above it.',
  },
  {
    topic: 'Computer hardware',
    text:
      'The motherboard connects every component of a computer. It carries the sockets for the processor and ' +
      'the memory, the slots for expansion cards and the connectors for drives and peripherals. A graphics ' +
      'card, or GPU, contains thousands of small cores designed to perform the same calculation on many pieces ' +
      'of data at once, which is ideal for images, games and machine learning. The power supply converts ' +
      'current from the wall into the stable voltages the parts need. When the computer starts, the firmware ' +
      'tests the hardware, then loads the operating system from the storage drive.',
  },
];

/**
 * Gives the paragraphs of a test one after the other, in a random order, without repeating
 * one before all were used.
 */
export class TextPicker {
  private queue: TypingText[] = [];
  private last?: TypingText;

  constructor(
    private readonly texts: readonly TypingText[] = TYPING_TEXTS,
    private readonly random: () => number = Math.random,
  ) {}

  next(): TypingText {
    if (this.queue.length === 0) {
      this.queue = shuffle(this.texts, this.random);
      // A new round never starts with the paragraph that ended the previous one.
      if (this.queue.length > 1 && this.queue[0] === this.last) {
        this.queue.push(this.queue.shift()!);
      }
    }
    this.last = this.queue.shift()!;
    return this.last;
  }
}
